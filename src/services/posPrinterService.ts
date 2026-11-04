import { RestaurantOrder } from '../types';

export interface POSPrinterConfig {
  connectionType: 'serial' | 'usb' | 'browser';
  paperWidth: '80mm' | '58mm';
  baudRate: number;
  printerName: string;
  autoPrintNewOrders: boolean;
}

const STORAGE_KEY = 'tonys_kitchen_pos_printer_config';

const DEFAULT_CONFIG: POSPrinterConfig = {
  connectionType: 'serial',
  paperWidth: '80mm',
  baudRate: 9600,
  printerName: 'POS Thermal Printer',
  autoPrintNewOrders: false,
};

// Global active port reference in memory
let activeSerialPort: any = null;
let activeWriter: any = null;

export class POSPrinterService {
  private config: POSPrinterConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  public loadConfig(): POSPrinterConfig {
    if (typeof window === 'undefined') return DEFAULT_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch {}
    return DEFAULT_CONFIG;
  }

  public saveConfig(updates: Partial<POSPrinterConfig>): POSPrinterConfig {
    this.config = { ...this.config, ...updates };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        window.dispatchEvent(new CustomEvent('pos_printer_config_updated', { detail: this.config }));
      } catch {}
    }
    return this.config;
  }

  public getConfig(): POSPrinterConfig {
    return { ...this.config };
  }

  public isConnected(): boolean {
    return Boolean(activeSerialPort && activeWriter);
  }

  public isWebSerialSupported(): boolean {
    return typeof window !== 'undefined' && 'serial' in navigator;
  }

  public isWebUSBSupported(): boolean {
    return typeof window !== 'undefined' && 'usb' in navigator;
  }

  /**
   * Request user to pick a Web Serial (USB/COM) thermal printer and connect
   */
  public async connectSerialPrinter(): Promise<{ success: boolean; name?: string; error?: string }> {
    if (!this.isWebSerialSupported()) {
      return {
        success: false,
        error: 'Web Serial API is not supported in this browser. Please use Google Chrome on Desktop / POS machine.',
      };
    }

    try {
      // Prompt user to select COM / USB printer port
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: this.config.baudRate || 9600 });

      activeSerialPort = port;
      activeWriter = port.writable.getWriter();

      // Read port info
      const info = port.getInfo ? port.getInfo() : {};
      const name = info.usbVendorId
        ? `POS USB-Serial (VID: ${info.usbVendorId.toString(16).toUpperCase()})`
        : 'POS Thermal Printer';

      this.saveConfig({
        connectionType: 'serial',
        printerName: name,
      });

      return { success: true, name };
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        return { success: false, error: 'User cancelled port selection' };
      }
      return { success: false, error: err.message || 'Failed to open printer port' };
    }
  }

  /**
   * Disconnect the active printer port
   */
  public async disconnectPrinter(): Promise<void> {
    try {
      if (activeWriter) {
        await activeWriter.close();
        activeWriter = null;
      }
      if (activeSerialPort) {
        await activeSerialPort.close();
        activeSerialPort = null;
      }
    } catch (err) {
      console.warn('Error closing printer port:', err);
    }
    this.saveConfig({ printerName: '' });
  }

  /**
   * Generate raw ESC/POS binary buffer for a RestaurantOrder
   */
  public generateOrderEscPos(order: RestaurantOrder, paperWidth: '80mm' | '58mm' = '80mm'): Uint8Array {
    const charsPerLine = paperWidth === '80mm' ? 42 : 32;
    const encoder = new TextEncoder();
    const chunks: number[] = [];

    const addBytes = (...bytes: number[]) => {
      chunks.push(...bytes);
    };

    const addText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) {
        chunks.push(encoded[i]);
      }
    };

    const addLine = (text: string = '') => {
      addText(text);
      addBytes(0x0a); // LF
    };

    const addDivider = (char: string = '-') => {
      addLine(char.repeat(charsPerLine));
    };

    const addKeyValue = (key: string, val: string) => {
      const spaceNeeded = charsPerLine - key.length - val.length;
      if (spaceNeeded > 0) {
        addLine(key + ' '.repeat(spaceNeeded) + val);
      } else {
        addLine(`${key}: ${val}`);
      }
    };

    // --- ESC/POS Sequence Start ---
    addBytes(0x1b, 0x40); // ESC @ : Initialize printer
    addBytes(0x1b, 0x74, 0x00); // Character code table: PC437 / Standard

    // 1. Center Aligned Restaurant Header
    addBytes(0x1b, 0x61, 0x01); // Center align
    addBytes(0x1d, 0x21, 0x11); // Double width & height
    addBytes(0x1b, 0x45, 0x01); // Bold ON
    addLine("TONY'S KITCHEN");
    addBytes(0x1d, 0x21, 0x00); // Normal size
    addBytes(0x1b, 0x45, 0x00); // Bold OFF
    addLine("Authentic Thai Street Food");
    addLine("Bangkok, Thailand");
    addBytes(0x0a);

    // 2. Order Number & Status
    addBytes(0x1d, 0x21, 0x01); // Double height
    addBytes(0x1b, 0x45, 0x01); // Bold ON
    addLine(`ORDER ${order.orderNumberFormatted || '#' + order.orderNumber}`);
    addBytes(0x1d, 0x21, 0x00); // Normal size
    addBytes(0x1b, 0x45, 0x00); // Bold OFF

    // Order date & type
    const dateStr = new Date(order.createdAt).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    addLine(dateStr);
    addBytes(0x1b, 0x45, 0x01); // Bold ON
    addLine(`*** ${(order.orderType || 'PICKUP').toUpperCase()} ***`);
    addBytes(0x1b, 0x45, 0x00); // Bold OFF

    // 3. Customer Info (Left Align)
    addBytes(0x1b, 0x61, 0x00); // Left align
    addDivider('=');
    addLine(`Customer: ${order.customer?.name || 'Walk-in Customer'}`);
    if (order.customer?.phone) {
      addLine(`Phone:    ${order.customer.phone}`);
    }
    if (order.orderType === 'delivery' && order.customer?.deliveryAddress) {
      addLine(`Address:  ${order.customer.deliveryAddress}`);
    }
    if (order.customer?.notes) {
      addLine(`Note:     ${order.customer.notes}`);
    }
    addDivider('-');

    // 4. Order Items
    addBytes(0x1b, 0x45, 0x01); // Bold ON
    addKeyValue('ITEM', 'TOTAL');
    addBytes(0x1b, 0x45, 0x00); // Bold OFF
    addDivider('-');

    order.items.forEach((item) => {
      const name = item.name?.en || (typeof item.name === 'string' ? item.name : 'Dish');
      const itemTitle = `${item.quantity}x ${name}`;
      const priceStr = `THB ${(item.subtotal || 0).toLocaleString()}`;
      addKeyValue(itemTitle, priceStr);

      if (item.selectedModifiers && item.selectedModifiers.length > 0) {
        item.selectedModifiers.forEach((m) => {
          const modName = m.optionName?.en || (typeof m.optionName === 'string' ? m.optionName : '');
          if (modName) {
            addLine(`  + ${modName}`);
          }
        });
      }

      if (item.specialRequest) {
        addLine(`  * ${item.specialRequest}`);
      }
    });

    addDivider('-');

    // 5. Total & Payment
    addKeyValue('Subtotal:', `THB ${(order.subtotal || order.total || 0).toLocaleString()}`);
    addBytes(0x1b, 0x45, 0x01); // Bold ON
    addBytes(0x1d, 0x21, 0x10); // Double width
    addKeyValue('TOTAL:', `THB ${(order.total || 0).toLocaleString()}`);
    addBytes(0x1d, 0x21, 0x00); // Normal size
    addBytes(0x1b, 0x45, 0x00); // Bold OFF

    addDivider('-');
    const payMethod = (order.paymentMethod === 'qr_payment' ? 'PROMPTPAY QR' : 'CASH').toUpperCase();
    const payStatus = (order.paymentStatus || 'pending').toUpperCase();
    addKeyValue('Payment:', `${payMethod} (${payStatus})`);
    addDivider('=');

    // 6. Footer (Center Align)
    addBytes(0x1b, 0x61, 0x01); // Center align
    addLine("Thank you for your order!");
    addLine("Tony's Kitchen Bangkok");
    addLine("Please check order before leaving");
    addBytes(0x0a);

    // 7. Feed and Paper Cut
    addBytes(0x0a, 0x0a, 0x0a, 0x0a); // 4 Line feeds
    addBytes(0x1d, 0x56, 0x42, 0x00); // GS V 66 0 : Partial cut with feed

    return new Uint8Array(chunks);
  }

  /**
   * Generate raw ESC/POS test slip
   */
  public generateTestSlipEscPos(paperWidth: '80mm' | '58mm' = '80mm'): Uint8Array {
    const charsPerLine = paperWidth === '80mm' ? 42 : 32;
    const encoder = new TextEncoder();
    const chunks: number[] = [];

    const addBytes = (...bytes: number[]) => chunks.push(...bytes);
    const addText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) chunks.push(encoded[i]);
    };
    const addLine = (text: string = '') => {
      addText(text);
      addBytes(0x0a);
    };

    addBytes(0x1b, 0x40); // Init
    addBytes(0x1b, 0x61, 0x01); // Center
    addBytes(0x1d, 0x21, 0x11); // Double size
    addLine("TONY'S KITCHEN");
    addBytes(0x1d, 0x21, 0x00);
    addLine("POS THERMAL PRINTER TEST");
    addLine("-".repeat(charsPerLine));
    addLine(`Paper: ${paperWidth} Roll`);
    addLine(`Status: CONNECTED OK`);
    addLine(new Date().toLocaleString());
    addLine("-".repeat(charsPerLine));
    addLine("Thermal receipt printer is working!");
    addBytes(0x0a, 0x0a, 0x0a, 0x0a);
    addBytes(0x1d, 0x56, 0x42, 0x00); // Cut

    return new Uint8Array(chunks);
  }

  /**
   * Print order directly to POS thermal printer
   */
  public async printOrder(order: RestaurantOrder): Promise<{ success: boolean; error?: string }> {
    // 1. If Web Serial printer is active, write directly!
    if (activeWriter) {
      try {
        const rawBytes = this.generateOrderEscPos(order, this.config.paperWidth);
        await activeWriter.write(rawBytes);
        return { success: true };
      } catch (err: any) {
        console.error('Failed to write to POS printer:', err);
        return { success: false, error: err.message || 'Printer write error' };
      }
    }

    // 2. Fallback to system print if not connected
    return {
      success: false,
      error: 'NO_PRINTER_CONNECTED',
    };
  }

  /**
   * Print test slip directly to POS thermal printer
   */
  public async printTestSlip(): Promise<{ success: boolean; error?: string }> {
    if (!activeWriter) {
      return { success: false, error: 'NO_PRINTER_CONNECTED' };
    }

    try {
      const rawBytes = this.generateTestSlipEscPos(this.config.paperWidth);
      await activeWriter.write(rawBytes);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Test print failed' };
    }
  }
}

export const posPrinterService = new POSPrinterService();
