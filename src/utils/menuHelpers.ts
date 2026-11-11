import { MainOption, MenuItem } from '../types';

/**
 * Returns intelligent default main options for any menu item
 * based on its name and characteristics, so every dish has main options ready.
 */
export function getDefaultMainOptions(item?: Partial<MenuItem>): MainOption[] {
  const th = (item?.name?.th || '').toLowerCase();
  const en = (item?.name?.en || '').toLowerCase();

  // Dishes that traditionally offer protein/meat choices
  const isProteinDish =
    th.includes('ผัดไทย') ||
    th.includes('กะเพรา') ||
    th.includes('ข้าวผัด') ||
    th.includes('แกง') ||
    th.includes('ต้มยำ') ||
    th.includes('ผัดซีอิ๊ว') ||
    th.includes('ผัดขี้เมา') ||
    en.includes('pad thai') ||
    en.includes('curry') ||
    en.includes('fried rice') ||
    en.includes('basil') ||
    en.includes('tom yum');

  if (isProteinDish) {
    return [
      {
        id: 'opt_pork_chicken',
        name: { th: 'หมู / ไก่', en: 'Pork / Chicken' },
        priceAdjustment: 0,
        availability: 'available',
        displayOrder: 1,
      },
      {
        id: 'opt_beef',
        name: { th: 'เนื้อวัว', en: 'Beef' },
        priceAdjustment: 25,
        availability: 'available',
        displayOrder: 2,
      },
      {
        id: 'opt_crispy_pork',
        name: { th: 'หมูกรอบ', en: 'Crispy Pork Belly' },
        priceAdjustment: 30,
        availability: 'available',
        displayOrder: 3,
      },
      {
        id: 'opt_seafood',
        name: { th: 'กุ้งสด / ทะเล', en: 'Shrimp / Seafood' },
        priceAdjustment: 35,
        availability: 'available',
        displayOrder: 4,
      },
      {
        id: 'opt_tofu',
        name: { th: 'เต้าหู้ / เจ', en: 'Tofu / Vegetarian' },
        priceAdjustment: 0,
        availability: 'available',
        displayOrder: 5,
      },
    ];
  }

  // Standard portion size default options for appetizers, salads, desserts, soups, etc.
  return [
    {
      id: 'opt_regular',
      name: { th: 'ธรรมดา', en: 'Regular' },
      priceAdjustment: 0,
      availability: 'available',
      displayOrder: 1,
    },
    {
      id: 'opt_special',
      name: { th: 'พิเศษ', en: 'Special (Large)' },
      priceAdjustment: 20,
      availability: 'available',
      displayOrder: 2,
    },
  ];
}

/**
 * Ensures an item always has valid mainOptions populated.
 */
export function ensureItemMainOptions(item: MenuItem): MenuItem {
  if (Array.isArray(item.mainOptions) && item.mainOptions.length > 0) {
    return {
      ...item,
      mainOptions: [...item.mainOptions].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    };
  }
  return {
    ...item,
    mainOptions: getDefaultMainOptions(item),
  };
}

/**
 * Performs a stable direct swap of displayOrder between an option and its neighbor.
 */
export function swapMainOptionsOrder(
  options: MainOption[],
  optionId: string,
  direction: 'up' | 'down'
): MainOption[] {
  const sorted = [...options].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  const index = sorted.findIndex((o) => o.id === optionId);
  if (index < 0) return options;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return options;

  const currentItem = sorted[index];
  const targetItem = sorted[targetIndex];
  const currentOrder = currentItem.displayOrder ?? index + 1;
  const targetOrder = targetItem.displayOrder ?? targetIndex + 1;

  return options.map((opt) => {
    if (opt.id === currentItem.id) return { ...opt, displayOrder: targetOrder };
    if (opt.id === targetItem.id) return { ...opt, displayOrder: currentOrder };
    return opt;
  });
}
