/**
 * Thai to English Culinary & Restaurant Translator Utility
 * Provides instant dictionary matching and online neural translation
 * with offline culinary fallback for Thai dishes, categories, and options.
 */

// Curated dictionary of Thai culinary terms, dishes, categories, and options
const THAI_FOOD_DICTIONARY: Record<string, string> = {
  // Categories
  'เมนูข้าว': 'Rice Dishes',
  'อาหารจานเดียว': 'Single Dishes',
  'กับข้าว': 'Main Dishes',
  'เมนูเส้น': 'Noodle Dishes',
  'ก๋วยเตี๋ยว': 'Noodles',
  'ต้มและแกง': 'Soups & Curries',
  'ต้ม/แกง': 'Soups & Curries',
  'ของทานเล่น': 'Appetizers & Snacks',
  'ของกินเล่น': 'Appetizers',
  'อาหารว่าง': 'Appetizers',
  'ยำและสลัด': 'Spicy Salads',
  'ยำ/สลัด': 'Spicy Salads',
  'ยำ': 'Spicy Salads',
  'ส้มตำ': 'Papaya Salad',
  'เครื่องดื่ม': 'Beverages',
  'ของหวาน': 'Desserts',
  'ขนมหวาน': 'Desserts',
  'เมนูแนะนำ': 'Recommended Dishes',
  'เมนูยอดนิยม': 'Popular Dishes',
  'เมนูพิเศษ': 'Special Dishes',
  'ชุดเซ็ต': 'Set Meals',
  'น้ำซุป': 'Broth & Soups',

  // Common Dishes
  'ผัดกะเพรา': 'Stir-Fried Holy Basil',
  'ผัดกะเพราหมูสับ': 'Stir-Fried Basil with Minced Pork',
  'ผัดกะเพราหมูกรอบ': 'Stir-Fried Basil with Crispy Pork',
  'ผัดกะเพราไก่': 'Stir-Fried Basil with Chicken',
  'ผัดกะเพราเนื้อ': 'Stir-Fried Basil with Beef',
  'ผัดกะเพรากุ้ง': 'Stir-Fried Basil with Shrimp',
  'ผัดกะเพราปลาหมึก': 'Stir-Fried Basil with Squid',
  'ผัดกะเพราทะเล': 'Stir-Fried Basil with Seafood',
  'ข้าวผัด': 'Fried Rice',
  'ข้าวผัดหมู': 'Pork Fried Rice',
  'ข้าวผัดไก่': 'Chicken Fried Rice',
  'ข้าวผัดกุ้ง': 'Shrimp Fried Rice',
  'ข้าวผัดปู': 'Crab Fried Rice',
  'ข้าวผัดทะเล': 'Seafood Fried Rice',
  'ข้าวผัดอเมริกัน': 'American Fried Rice',
  'ข้าวมันไก่': 'Hainanese Chicken Rice',
  'ข้าวมันไก่ทอด': 'Fried Chicken Rice',
  'ข้าวมันไก่ผสม': 'Mixed Steamed and Fried Chicken Rice',
  'ข้าวหมูกรอบ': 'Crispy Pork Belly Rice',
  'ข้าวหมูแดง': 'Red Roast Pork Rice',
  'ข้าวขาหมู': 'Stewed Pork Leg Rice',
  'ข้าวไข่เจียว': 'Thai Omelette Rice',
  'ผัดไทย': 'Pad Thai',
  'ผัดไทยกุ้งสด': 'Pad Thai with Fresh Shrimp',
  'ผัดซีอิ๊ว': 'Stir-Fried Soy Sauce Flat Noodles (Pad See Ew)',
  'ผัดซีอิ๊วหมู': 'Stir-Fried Noodles with Pork (Pad See Ew)',
  'ผัดซีอิ๊วไก่': 'Stir-Fried Noodles with Chicken',
  'ราดหน้า': 'Noodles in Thick Gravy (Rad Na)',
  'ราดหน้าหมูหมัก': 'Marinated Pork Noodles in Gravy',
  'ต้มยำกุ้ง': 'Tom Yum Kung (Spicy Shrimp Soup)',
  'ต้มยำกุ้งน้ำข้น': 'Creamy Tom Yum Kung',
  'ต้มยำกุ้งน้ำใส': 'Clear Tom Yum Kung',
  'ต้มยำรวมมิตร': 'Spicy Mixed Seafood Soup (Tom Yum)',
  'ต้มข่าไก่': 'Chicken Coconut Soup (Tom Kha Gai)',
  'ต้มจืดเต้าหู้หมูสับ': 'Clear Soup with Tofu & Minced Pork',
  'แกงเขียวหวาน': 'Green Curry',
  'แกงเขียวหวานไก่': 'Green Curry with Chicken',
  'แกงมัสมั่นไก่': 'Massaman Curry with Chicken',
  'แกงส้มชะอมกุ้ง': 'Sour Curry with Cha-Om Omelette & Shrimp',
  'แกงเผ็ดเป็ดย่าง': 'Red Curry with Roasted Duck',
  'ลาบหมู': 'Spicy Minced Pork Salad (Larb Moo)',
  'น้ำตกคอหมูย่าง': 'Grilled Pork Neck Spicy Salad (Nam Tok)',
  'คอหมูย่าง': 'Grilled Pork Neck',
  'ไก่ย่าง': 'Grilled Chicken',
  'ไก่ทอด': 'Fried Chicken',
  'หมูทอดกระเทียม': 'Fried Pork with Garlic and Pepper',
  'ไก่ทอดกระเทียม': 'Fried Chicken with Garlic and Pepper',
  'ไข่พะโล้': 'Sweet Soy Stewed Eggs with Pork',

  // Drinks & Desserts
  'ชาไทย': 'Thai Iced Tea',
  'ชาเย็น': 'Thai Iced Tea',
  'ชามะนาว': 'Iced Lemon Tea',
  'ชาเขียวนม': 'Thai Iced Green Tea',
  'กาแฟโบราณ': 'Traditional Thai Iced Coffee',
  'โอเลี้ยง': 'Iced Black Coffee (O-Liang)',
  'นมชมพู': 'Pink Milk (Nom Yen)',
  'น้ำเปล่า': 'Bottled Water',
  'น้ำแข็ง': 'Ice',
  'น้ำอัดลม': 'Soft Drink',
  'ข้าวเหนียวมะม่วง': 'Mango Sticky Rice',
  'บัวลอย': 'Bua Loy (Sweet Rice Balls in Coconut Milk)',

  // Modifier Groups & Options
  'ระดับความเผ็ด': 'Spiciness Level',
  'ไม่เผ็ด': 'Non-Spicy',
  'เผ็ดน้อย': 'Mild Spicy',
  'เผ็ดปานกลาง': 'Medium Spicy',
  'เผ็ดมาก': 'Very Spicy',
  'เผ็ดสะใจ': 'Extra Hot & Spicy',
  'เลือกเนื้อสัตว์': 'Choice of Meat',
  'หมู': 'Pork',
  'เนื้อหมู': 'Pork',
  'ไก่': 'Chicken',
  'เนื้อไก่': 'Chicken',
  'เนื้อ': 'Beef',
  'เนื้อวัว': 'Beef',
  'กุ้ง': 'Shrimp',
  'ปลาหมึก': 'Squid',
  'ทะเล': 'Seafood',
  'หมูกรอบ': 'Crispy Pork',
  'หมูสับ': 'Minced Pork',
  'เต้าหู้': 'Tofu',
  'ไข่ดาว': 'Fried Egg',
  'ไข่ดาวไม่สุก': 'Sunny Side Up Egg (Runny Yolk)',
  'ไข่ดาวสุก': 'Well-Done Fried Egg',
  'ไข่เจียว': 'Thai Omelette',
  'ไข่ต้ม': 'Boiled Egg',
  'เพิ่มข้าว': 'Extra Rice',
  'ข้าวสวย': 'Steamed Jasmine Rice',
  'ข้าวเหนียว': 'Sticky Rice',
  'พิเศษ': 'Extra / Large Portion',
  'ธรรมดา': 'Regular Size',
  'ระดับความหวาน': 'Sweetness Level',
  'หวานปกติ': 'Normal Sweet (100%)',
  'หวานน้อย': 'Less Sweet (50%)',
  'ไม่หวาน': 'Unsweetened (0%)',
  'ไม่ใส่น้ำตาล': 'No Sugar',
  'ไม่ใส่ผัก': 'No Vegetables',
  'ไม่ใส่พริก': 'No Chili',
  'ไม่ใส่กระเทียม': 'No Garlic',
  'ไม่ใส่ต้นหอม': 'No Green Onions',
  'ไม่ใส่ผงชูรส': 'No MSG',
  'แยกน้ำ': 'Separate Soup / Broth',
  'แยกน้ำจิ้ม': 'Separate Dipping Sauce',
  'น้ำจิ้มซีฟู้ด': 'Seafood Dipping Sauce',
};

// Culinary keywords for smart token-based translation fallback
const CULINARY_TOKENS: Record<string, string> = {
  'ข้าวผัด': 'Fried Rice',
  'ผัดกะเพรา': 'Stir-Fried Basil',
  'ผัด': 'Stir-Fried',
  'ทอด': 'Fried',
  'นึ่ง': 'Steamed',
  'ต้ม': 'Boiled / Soup',
  'แกง': 'Curry',
  'ย่าง': 'Grilled',
  'ปิ้ง': 'Barbecued',
  'อบ': 'Baked',
  'ชุบแป้งทอด': 'Deep-Fried Battered',
  'ราดข้าว': 'over Rice',
  'ข้าว': 'Rice',
  'เส้นใหญ่': 'Wide Flat Noodles',
  'เส้นเล็ก': 'Thin Rice Noodles',
  'หมี่ขาว': 'Rice Vermicelli',
  'บะหมี่': 'Egg Noodles',
  'วุ้นเส้น': 'Glass Noodles',
  'หมูกรอบ': 'Crispy Pork',
  'หมูสับ': 'Minced Pork',
  'หมูชิ้น': 'Sliced Pork',
  'หมู': 'Pork',
  'ไก่กรอบ': 'Crispy Chicken',
  'ไก่': 'Chicken',
  'เนื้อวัว': 'Beef',
  'เนื้อ': 'Beef',
  'กุ้ง': 'Shrimp',
  'ปลาหมึก': 'Squid',
  'ปลา': 'Fish',
  'ทะเล': 'Seafood',
  'ไข่ดาว': 'Fried Egg',
  'ไข่เจียว': 'Omelette',
  'ไข่ต้ม': 'Boiled Egg',
  'กระเทียม': 'Garlic',
  'พริกไทย': 'Pepper',
  'น้ำมันหอย': 'Oyster Sauce',
  'พริกแกง': 'Red Curry Paste',
  'พริกเผา': 'Chili Paste',
  'ต้มยำ': 'Tom Yum',
  'ต้มข่า': 'Tom Kha Coconut Soup',
  'เขียวหวาน': 'Green Curry',
  'มัสมั่น': 'Massaman Curry',
  'น้ำข้น': 'Creamy Style',
  'น้ำใส': 'Clear Broth',
  'พิเศษ': 'Extra',
  'ธรรมดา': 'Regular',
  'เผ็ด': 'Spicy',
  'ไม่เผ็ด': 'Non-Spicy',
  'หวาน': 'Sweet',
  'เปรี้ยว': 'Sour',
  'เค็ม': 'Salty',
  'เย็น': 'Iced',
  'ร้อน': 'Hot',
  'ปั่น': 'Frappe / Smoothie',
  'ชา': 'Tea',
  'กาแฟ': 'Coffee',
  'นม': 'Milk',
  'น้ำ': 'Juice / Water',
};

/**
 * Clean up HTML entities, fix punctuation spacing, and capitalize words nicely.
 */
function formatEnglishText(text: string): string {
  if (!text) return '';

  let cleaned = text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // If text starts with lowercase, capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Capitalize title words for short phrases under 60 chars
  if (cleaned.length < 60 && !cleaned.includes('.')) {
    const minorWords = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'with', 'over']);
    cleaned = cleaned
      .split(' ')
      .map((word, idx) => {
        const lower = word.toLowerCase();
        if (idx > 0 && minorWords.has(lower)) {
          return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  return cleaned;
}

/**
 * Fallback rule-based translation for Thai culinary terms if offline or API limit reached.
 */
function fallbackCulinaryTranslate(thaiText: string): string {
  let remaining = thaiText.trim();
  const matchedTokens: string[] = [];

  // Sort culinary tokens by length descending so longer phrases match first
  const sortedTokens = Object.keys(CULINARY_TOKENS).sort((a, b) => b.length - a.length);

  for (const token of sortedTokens) {
    if (remaining.includes(token)) {
      matchedTokens.push(CULINARY_TOKENS[token]);
      remaining = remaining.replace(token, ' ').trim();
    }
  }

  if (matchedTokens.length > 0) {
    return matchedTokens.join(' ');
  }

  return '';
}

/**
 * Checks if a string contains Thai characters
 */
export function containsThai(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Translates Thai text to English.
 * 1. Checks curated food dictionary first (instant & exact).
 * 2. If not found, calls translation API with short timeout.
 * 3. If offline or error, uses smart culinary token fallback.
 */
export async function translateThaiToEnglish(thaiText: string): Promise<string> {
  const trimmed = thaiText.trim();
  if (!trimmed) return '';

  // If the user already typed Latin/English text without any Thai, preserve it
  if (!containsThai(trimmed)) {
    return formatEnglishText(trimmed);
  }

  // 1. Direct dictionary check
  const normalizedKey = trimmed.toLowerCase();
  if (THAI_FOOD_DICTIONARY[normalizedKey]) {
    return THAI_FOOD_DICTIONARY[normalizedKey];
  }

  // Check without spaces or leading/trailing symbols
  const strippedKey = normalizedKey.replace(/[\s\-_]+/g, '');
  if (THAI_FOOD_DICTIONARY[strippedKey]) {
    return THAI_FOOD_DICTIONARY[strippedKey];
  }

  // 2. Online translation via MyMemory API with 3.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const encodedQuery = encodeURIComponent(trimmed);
    const url = `https://api.mymemory.translated.net/get?q=${encodedQuery}&langpair=th|en`;

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const translated = data?.responseData?.translatedText;

      // Ensure response is not a rate-limit error message
      if (
        translated &&
        typeof translated === 'string' &&
        !translated.startsWith('MYMEMORY WARNING') &&
        !translated.startsWith('QUERY LENGTH LIMIT')
      ) {
        return formatEnglishText(translated);
      }
    }
  } catch {
    // Network failure, timeout, or aborted - proceed to fallback
  }

  // 3. Smart culinary token fallback
  const fallback = fallbackCulinaryTranslate(trimmed);
  if (fallback) {
    return formatEnglishText(fallback);
  }

  // If all fails, return empty so user can type manually
  return '';
}
