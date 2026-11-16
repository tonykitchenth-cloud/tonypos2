/**
 * Thai to English Culinary & Restaurant Translator Utility
 * Provides instant dictionary matching, online neural translation,
 * and ordered left-to-right culinary token fallback for Thai dishes,
 * categories, options, and store messages.
 */

// In-memory cache to avoid redundant network requests and ensure instant repeat lookups
const translationCache = new Map<string, string>();

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
  'ของทอด': 'Fried Dishes',
  'ปิ้งย่าง': 'Grilled Dishes',
  'อาหารทะเล': 'Seafood Dishes',
  'อาหารมังสวิรัติ': 'Vegetarian Dishes',
  'อาหารเจ': 'Vegan Dishes',
  'ท็อปปิ้ง': 'Toppings',
  'เครื่องเคียง': 'Side Dishes',

  // Common Dishes
  'ผัดกะเพรา': 'Stir-Fried Holy Basil',
  'ข้าวกะเพรา': 'Holy Basil Rice',
  'ผัดกะเพราหมูสับ': 'Stir-Fried Basil with Minced Pork',
  'ข้าวกะเพราหมูสับ': 'Minced Pork Holy Basil Rice',
  'ผัดกะเพราหมูกรอบ': 'Stir-Fried Basil with Crispy Pork',
  'ข้าวกะเพราหมูกรอบ': 'Crispy Pork Holy Basil Rice',
  'ผัดกะเพราหมูชิ้น': 'Stir-Fried Basil with Sliced Pork',
  'ข้าวกะเพราหมูชิ้น': 'Sliced Pork Holy Basil Rice',
  'ผัดกะเพราไก่': 'Stir-Fried Basil with Chicken',
  'ข้าวกะเพราไก่': 'Chicken Holy Basil Rice',
  'ผัดกะเพราเนื้อ': 'Stir-Fried Basil with Beef',
  'ข้าวกะเพราเนื้อ': 'Beef Holy Basil Rice',
  'ผัดกะเพรากุ้ง': 'Stir-Fried Basil with Shrimp',
  'ข้าวกะเพรากุ้ง': 'Shrimp Holy Basil Rice',
  'ผัดกะเพราปลาหมึก': 'Stir-Fried Basil with Squid',
  'ผัดกะเพราทะเล': 'Stir-Fried Basil with Seafood',
  'ข้าวกะเพราทะเล': 'Seafood Holy Basil Rice',
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
  'ข้าวไข่เจียวหมูสับ': 'Minced Pork Omelette Rice',
  'ข้าวไข่ข้น': 'Creamy Omelette Rice',
  'ข้าวหมูกระเทียม': 'Garlic Pork Rice',
  'ข้าวไก่กระเทียม': 'Garlic Chicken Rice',
  'ผัดไทย': 'Pad Thai',
  'ผัดไทยกุ้งสด': 'Pad Thai with Fresh Shrimp',
  'ผัดซีอิ๊ว': 'Stir-Fried Soy Sauce Flat Noodles (Pad See Ew)',
  'ผัดซีอิ๊วหมู': 'Stir-Fried Noodles with Pork (Pad See Ew)',
  'ผัดซีอิ๊วไก่': 'Stir-Fried Noodles with Chicken',
  'ราดหน้า': 'Noodles in Thick Gravy (Rad Na)',
  'ราดหน้าหมูหมัก': 'Marinated Pork Noodles in Gravy',
  'ก๋วยเตี๋ยวต้มยำ': 'Tom Yum Noodles',
  'ก๋วยเตี๋ยวน้ำใส': 'Clear Broth Noodles',
  'ก๋วยเตี๋ยวเรือ': 'Boat Noodles',
  'ก๋วยเตี๋ยวเนื้อ': 'Beef Noodles',
  'สุกี้น้ำ': 'Sukiyaki Soup',
  'สุกี้แห้ง': 'Dry Stir-Fried Sukiyaki',
  'ต้มยำกุ้ง': 'Tom Yum Kung (Spicy Shrimp Soup)',
  'ต้มยำกุ้งน้ำข้น': 'Creamy Tom Yum Kung',
  'ต้มยำกุ้งน้ำใส': 'Clear Tom Yum Kung',
  'ต้มยำรวมมิตร': 'Spicy Mixed Seafood Soup (Tom Yum)',
  'ต้มข่าไก่': 'Chicken Coconut Soup (Tom Kha Gai)',
  'ต้มจืดเต้าหู้หมูสับ': 'Clear Soup with Tofu & Minced Pork',
  'ต้มแซ่บกระดูกอ่อน': 'Spicy Pork Rib Soup',
  'แกงเขียวหวาน': 'Green Curry',
  'แกงเขียวหวานไก่': 'Green Curry with Chicken',
  'แกงมัสมั่นไก่': 'Massaman Curry with Chicken',
  'แกงส้มชะอมกุ้ง': 'Sour Curry with Cha-Om Omelette & Shrimp',
  'แกงเผ็ดเป็ดย่าง': 'Red Curry with Roasted Duck',
  'พะแนงหมู': 'Panang Pork Curry',
  'ลาบหมู': 'Spicy Minced Pork Salad (Larb Moo)',
  'น้ำตกคอหมูย่าง': 'Grilled Pork Neck Spicy Salad (Nam Tok)',
  'คอหมูย่าง': 'Grilled Pork Neck',
  'ไก่ย่าง': 'Grilled Chicken',
  'ไก่ทอด': 'Fried Chicken',
  'หมูทอดกระเทียม': 'Fried Pork with Garlic and Pepper',
  'ไก่ทอดกระเทียม': 'Fried Chicken with Garlic and Pepper',
  'ไข่พะโล้': 'Sweet Soy Stewed Eggs with Pork',
  'ส้มตำไทย': 'Thai Papaya Salad (Som Tum Thai)',
  'ส้มตำปูปลาร้า': 'Papaya Salad with Crab & Fermented Fish',
  'ยำวุ้นเส้น': 'Spicy Glass Noodle Salad',
  'ยำรวมมิตร': 'Spicy Mixed Seafood Salad',

  // Drinks & Desserts
  'ชาไทย': 'Thai Iced Tea',
  'ชาเย็น': 'Thai Iced Tea',
  'ชามะนาว': 'Iced Lemon Tea',
  'ชาเขียว': 'Green Tea',
  'ชาเขียวนม': 'Thai Iced Green Tea',
  'ชาเขียวเย็น': 'Iced Green Tea',
  'กาแฟ': 'Coffee',
  'กาแฟเย็น': 'Iced Coffee',
  'กาแฟร้อน': 'Hot Coffee',
  'กาแฟโบราณ': 'Traditional Thai Iced Coffee',
  'อเมริกาโน่': 'Americano',
  'ลาเต้': 'Latte',
  'คาปูชิโน่': 'Cappuccino',
  'เอสเพรสโซ่': 'Espresso',
  'มอคค่า': 'Mocha',
  'โกโก้': 'Cocoa',
  'โอเลี้ยง': 'Iced Black Coffee (O-Liang)',
  'นมชมพู': 'Pink Milk (Nom Yen)',
  'นมสด': 'Fresh Milk',
  'น้ำส้ม': 'Orange Juice',
  'น้ำส้มคั้น': 'Fresh Squeezed Orange Juice',
  'น้ำมะนาว': 'Lime Juice',
  'น้ำลำไย': 'Longan Juice',
  'น้ำเก๊กฮวย': 'Chrysanthemum Tea',
  'น้ำกระเจี๊ยบ': 'Roselle Juice',
  'น้ำเปล่า': 'Bottled Water',
  'น้ำแข็ง': 'Ice',
  'น้ำอัดลม': 'Soft Drink',
  'โค้ก': 'Coke',
  'เป๊ปซี่': 'Pepsi',
  'สไปรท์': 'Sprite',
  'ข้าวเหนียวมะม่วง': 'Mango Sticky Rice',
  'บัวลอย': 'Bua Loy (Sweet Rice Balls in Coconut Milk)',
  'ทับทิมกรอบ': 'Red Rubies in Coconut Milk',
  'ไอศกรีม': 'Ice Cream',

  // Main Options, Modifier Groups & Options
  'ตัวเลือกหลัก': 'Main Option',
  'ตัวเลือกใหม่': 'New Option',
  'ไม่ระบุ': 'Unspecified',
  'ระดับความเผ็ด': 'Spiciness Level',
  'ไม่เผ็ด': 'Non-Spicy',
  'เผ็ดน้อย': 'Mild Spicy',
  'เผ็ดกลาง': 'Medium Spicy',
  'เผ็ดปานกลาง': 'Medium Spicy',
  'เผ็ดมาก': 'Very Spicy',
  'เผ็ดสะใจ': 'Extra Hot & Spicy',
  'เลือกเนื้อสัตว์': 'Choice of Meat',
  'เนื้อสัตว์': 'Meat',
  'เลือกเส้น': 'Choice of Noodles',
  'เส้น': 'Noodles',
  'ขนาด': 'Size',
  'ขนาดเล็ก': 'Small Size',
  'ขนาดกลาง': 'Medium Size',
  'ขนาดใหญ่': 'Large Size',
  'เล็ก': 'Small',
  'กลาง': 'Medium',
  'ใหญ่': 'Large',
  'จัมโบ้': 'Jumbo',
  'หมู': 'Pork',
  'เนื้อหมู': 'Pork',
  'หมูชิ้น': 'Sliced Pork',
  'หมูนุ่ม': 'Tender Pork',
  'หมูยอ': 'Vietnamese Pork Sausage',
  'ไก่': 'Chicken',
  'เนื้อไก่': 'Chicken',
  'เนื้อ': 'Beef',
  'เนื้อวัว': 'Beef',
  'กุ้ง': 'Shrimp',
  'กุ้งสด': 'Fresh Shrimp',
  'ปลาหมึก': 'Squid',
  'ปลา': 'Fish',
  'ทะเล': 'Seafood',
  'รวมมิตร': 'Mixed',
  'หมูกรอบ': 'Crispy Pork',
  'หมูสับ': 'Minced Pork',
  'หมูแดง': 'Red Roast Pork',
  'เต้าหู้': 'Tofu',
  'ไข่ดาว': 'Fried Egg',
  'ไข่ดาวไม่สุก': 'Sunny Side Up Egg (Runny Yolk)',
  'ไข่ดาวสุก': 'Well-Done Fried Egg',
  'ไข่เจียว': 'Thai Omelette',
  'ไข่ข้น': 'Creamy Omelette',
  'ไข่ต้ม': 'Boiled Egg',
  'ไข่ลวก': 'Soft-Boiled Egg',
  'ไข่เยี่ยวม้า': 'Century Egg',
  'ไข่เค็ม': 'Salted Egg',
  'เพิ่มไข่ดาว': 'Add Fried Egg',
  'เพิ่มไข่เจียว': 'Add Omelette',
  'เพิ่มข้าว': 'Extra Rice',
  'ข้าวสวย': 'Steamed Jasmine Rice',
  'ข้าวเหนียว': 'Sticky Rice',
  'ข้าวเปล่า': 'Plain Rice',
  'ราดข้าว': 'Over Rice',
  'พิเศษ': 'Special / Extra',
  'ธรรมดา': 'Regular',
  'จานเดี่ยว': 'Single Dish',
  'เส้นใหญ่': 'Wide Flat Noodles',
  'เส้นเล็ก': 'Thin Rice Noodles',
  'เส้นหมี่': 'Rice Vermicelli',
  'หมี่ขาว': 'Rice Vermicelli',
  'บะหมี่': 'Egg Noodles',
  'วุ้นเส้น': 'Glass Noodles',
  'มาม่า': 'Instant Noodles',
  'เส้นมาม่า': 'Instant Noodles',
  'ไม่ใส่เส้น': 'No Noodles',
  'น้ำใส': 'Clear Broth',
  'น้ำข้น': 'Creamy Soup',
  'น้ำตก': 'Dark Blood Broth (Nam Tok)',
  'ต้มยำ': 'Tom Yum',
  'แห้ง': 'Dry Style (No Soup)',
  'น้ำ': 'With Soup',
  'ระดับความหวาน': 'Sweetness Level',
  'หวานปกติ': 'Normal Sweet (100%)',
  'หวานมาก': 'Extra Sweet (125%)',
  'หวานน้อย': 'Less Sweet (50%)',
  'หวาน 25%': '25% Sweet',
  'หวาน 50%': '50% Sweet',
  'หวาน 75%': '75% Sweet',
  'หวาน 100%': '100% Sweet',
  'ไม่หวาน': 'Unsweetened (0%)',
  'ไม่ใส่น้ำตาล': 'No Sugar',
  'ไม่ใส่ผัก': 'No Vegetables',
  'ไม่ใส่พริก': 'No Chili',
  'ไม่ใส่กระเทียม': 'No Garlic',
  'ไม่ใส่ต้นหอม': 'No Green Onions',
  'ไม่ใส่ถั่ว': 'No Peanuts',
  'ไม่ใส่ผงชูรส': 'No MSG',
  'แยกน้ำ': 'Separate Soup / Broth',
  'แยกน้ำแข็ง': 'Separate Ice',
  'แยกน้ำจิ้ม': 'Separate Dipping Sauce',
  'น้ำจิ้มซีฟู้ด': 'Seafood Dipping Sauce',
  'น้ำจิ้มแจ่ว': 'Thai Chili Dipping Sauce (Jaew)',
  'น้ำปลาพริก': 'Chili Fish Sauce',
  'ชีส': 'Cheese',
  'เบคอน': 'Bacon',
  'แฮม': 'Ham',
  'ไส้กรอก': 'Sausage',
  'ปูอัด': 'Crab Stick',
  'ผักกาด': 'Lettuce',
  'ผักรวม': 'Mixed Vegetables',
  'เห็ด': 'Mushroom',

  // Common Store Taglines / Closure Messages
  'รสชาติไทยแท้ สั่งง่าย ส่งไว': 'Authentic Thai Flavors & Fast Ordering',
  'ร้านปิดชั่วคราว': 'Store Temporarily Closed',
  'ปิดร้านชั่วคราว': 'Store Temporarily Closed',
  'ขออภัย ร้านปิดให้บริการชั่วคราว': 'Sorry, the store is temporarily closed',
  'ขออภัย วันนี้ร้านปิดให้บริการ': 'Sorry, we are closed today',
  'หมดแล้ว': 'Sold Out',
};

// Culinary & menu tokens for ordered left-to-right translation fallback
const CULINARY_TOKENS: Record<string, string> = {
  'ข้าวกะเพรา': 'Holy Basil Rice with',
  'ผัดกะเพรา': 'Stir-Fried Holy Basil with',
  'กะเพรา': 'Holy Basil',
  'ข้าวผัด': 'Fried Rice',
  'ผัดซีอิ๊ว': 'Stir-Fried Soy Sauce Noodles',
  'ราดหน้า': 'Noodles in Gravy',
  'ก๋วยเตี๋ยว': 'Noodles',
  'เกาเหลา': 'Soup Without Noodles',
  'ต้มยำ': 'Tom Yum',
  'ต้มข่า': 'Tom Kha Coconut Soup',
  'ต้มแซ่บ': 'Spicy Sour Soup',
  'แกงจืด': 'Clear Soup',
  'แกงเขียวหวาน': 'Green Curry',
  'แกงมัสมั่น': 'Massaman Curry',
  'พะแนง': 'Panang Curry',
  'ส้มตำ': 'Papaya Salad',
  'น้ำตก': 'Grilled Salad',
  'ลาบ': 'Spicy Minced Salad',
  'สุกี้': 'Sukiyaki',
  'ผัดพริกแกง': 'Stir-Fried Red Curry Paste',
  'ผัดผงกะหรี่': 'Stir-Fried Curry Powder',
  'ผัดน้ำมันหอย': 'Stir-Fried Oyster Sauce',
  'ทอดกระเทียม': 'Fried with Garlic',
  'ชุบแป้งทอด': 'Deep-Fried Battered',
  'ผัด': 'Stir-Fried',
  'ทอด': 'Fried',
  'นึ่ง': 'Steamed',
  'ต้ม': 'Boiled',
  'แกง': 'Curry',
  'ย่าง': 'Grilled',
  'ปิ้ง': 'Barbecued',
  'อบ': 'Baked',
  'ยำ': 'Spicy Salad',
  'ราดข้าว': 'Over Rice',
  'กับข้าว': 'Side Dish',
  'ข้าวสวย': 'Steamed Rice',
  'ข้าวเหนียว': 'Sticky Rice',
  'ข้าว': 'Rice',
  'เส้นใหญ่': 'Wide Flat Noodles',
  'เส้นเล็ก': 'Thin Rice Noodles',
  'เส้นหมี่': 'Rice Vermicelli',
  'หมี่ขาว': 'Rice Vermicelli',
  'บะหมี่': 'Egg Noodles',
  'วุ้นเส้น': 'Glass Noodles',
  'มาม่า': 'Instant Noodles',
  'หมูกรอบ': 'Crispy Pork',
  'หมูสับ': 'Minced Pork',
  'หมูชิ้น': 'Sliced Pork',
  'หมูนุ่ม': 'Tender Pork',
  'หมูแดง': 'Roast Pork',
  'หมูยอ': 'Pork Sausage',
  'หมู': 'Pork',
  'ไก่กรอบ': 'Crispy Chicken',
  'ไก่ย่าง': 'Grilled Chicken',
  'ไก่ทอด': 'Fried Chicken',
  'ไก่': 'Chicken',
  'เนื้อวัว': 'Beef',
  'เนื้อ': 'Beef',
  'กุ้งสด': 'Fresh Shrimp',
  'กุ้ง': 'Shrimp',
  'ปลาหมึก': 'Squid',
  'ปูอัด': 'Crab Stick',
  'ปู': 'Crab',
  'ปลา': 'Fish',
  'เป็ด': 'Duck',
  'ทะเล': 'Seafood',
  'รวมมิตร': 'Mixed',
  'เต้าหู้': 'Tofu',
  'ไข่ดาว': 'Fried Egg',
  'ไข่เจียว': 'Omelette',
  'ไข่ข้น': 'Creamy Omelette',
  'ไข่ต้ม': 'Boiled Egg',
  'ไข่ลวก': 'Soft-Boiled Egg',
  'ไข่เยี่ยวม้า': 'Century Egg',
  'ไข่เค็ม': 'Salted Egg',
  'ไข่': 'Egg',
  'เบคอน': 'Bacon',
  'แฮม': 'Ham',
  'ไส้กรอก': 'Sausage',
  'ชีส': 'Cheese',
  'แซลมอน': 'Salmon',
  'ทูน่า': 'Tuna',
  'คะน้า': 'Chinese Broccoli',
  'ผักบุ้ง': 'Morning Glory',
  'ผัก': 'Vegetables',
  'เห็ด': 'Mushroom',
  'กระเทียม': 'Garlic',
  'พริกไทย': 'Pepper',
  'น้ำมันหอย': 'Oyster Sauce',
  'พริกแกง': 'Red Curry Paste',
  'พริกเผา': 'Chili Paste',
  'พริก': 'Chili',
  'น้ำข้น': 'Creamy',
  'น้ำใส': 'Clear Broth',
  'น้ำจิ้ม': 'Dipping Sauce',
  'ซอส': 'Sauce',
  'พิเศษ': 'Extra',
  'ธรรมดา': 'Regular',
  'จัมโบ้': 'Jumbo',
  'ใหญ่': 'Large',
  'กลาง': 'Medium',
  'เล็ก': 'Small',
  'เพิ่ม': 'Extra',
  'ไม่ใส่': 'No',
  'ไม่เผ็ด': 'Non-Spicy',
  'เผ็ดน้อย': 'Mild Spicy',
  'เผ็ดมาก': 'Very Spicy',
  'เผ็ด': 'Spicy',
  'ไม่หวาน': 'Unsweetened',
  'หวานน้อย': 'Less Sweet',
  'หวานปกติ': 'Normal Sweet',
  'หวาน': 'Sweet',
  'เปรี้ยว': 'Sour',
  'เค็ม': 'Salty',
  'เย็น': 'Iced',
  'ร้อน': 'Hot',
  'ปั่น': 'Smoothie',
  'แห้ง': 'Dry',
  'แยก': 'Separate',
  'ชาเขียว': 'Green Tea',
  'ชาไทย': 'Thai Tea',
  'ชา': 'Tea',
  'กาแฟ': 'Coffee',
  'โกโก้': 'Cocoa',
  'นมสด': 'Fresh Milk',
  'นม': 'Milk',
  'น้ำส้ม': 'Orange Juice',
  'น้ำมะนาว': 'Lime Juice',
  'น้ำแข็ง': 'Ice',
  'น้ำ': 'Water / Juice',
  'ขนาด': 'Size',
  'ระดับ': 'Level',
  'ชุด': 'Set',
  'จาน': 'Plate',
  'ถ้วย': 'Bowl',
  'แก้ว': 'Cup',
  'ขวด': 'Bottle',
  'กล่อง': 'Box',
  'ร้าน': 'Store',
  'ปิด': 'Closed',
  'เปิด': 'Open',
  'ชั่วคราว': 'Temporarily',
  'วันหยุด': 'Holiday',
  'ขออภัย': 'Sorry,',
  'รสชาติไทยแท้': 'Authentic Thai Taste',
  'สั่งง่าย': 'Easy Ordering',
  'ส่งไว': 'Fast Delivery',
  'สด': 'Fresh',
  'อร่อย': 'Delicious',
};

const SORTED_TOKEN_KEYS = Object.keys(CULINARY_TOKENS).sort((a, b) => b.length - a.length);

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

  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Capitalize title words for short phrases under 60 chars
  if (cleaned.length < 60 && !cleaned.includes('.')) {
    const minorWords = new Set([
      'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'nor',
      'of', 'on', 'or', 'so', 'the', 'to', 'with', 'over',
    ]);
    cleaned = cleaned
      .split(' ')
      .map((word, idx) => {
        if (!word) return word;
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
 * Checks if a string contains Thai characters
 */
export function containsThai(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Ordered left-to-right greedy longest-match fallback translation for Thai culinary terms.
 * Preserves natural word order as well as numbers and English words.
 */
function fallbackCulinaryTranslate(thaiText: string): string {
  const input = thaiText.trim();
  if (!input) return '';

  const parts: string[] = [];
  let i = 0;

  while (i < input.length) {
    // Preserve whitespace cleanly
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Preserve ASCII/numbers/punctuation sequence as-is
    if (!containsThai(input[i])) {
      let asciiEnd = i + 1;
      while (asciiEnd < input.length && !containsThai(input[asciiEnd]) && !/\s/.test(input[asciiEnd])) {
        asciiEnd++;
      }
      parts.push(input.slice(i, asciiEnd));
      i = asciiEnd;
      continue;
    }

    // Match longest dictionary or culinary token starting at position i
    let matched = false;
    for (const token of SORTED_TOKEN_KEYS) {
      if (input.startsWith(token, i)) {
        parts.push(CULINARY_TOKENS[token]);
        i += token.length;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // Check full dictionary keys at current position too
      const dictKeys = Object.keys(THAI_FOOD_DICTIONARY).sort((a, b) => b.length - a.length);
      for (const dk of dictKeys) {
        if (input.startsWith(dk, i)) {
          parts.push(THAI_FOOD_DICTIONARY[dk]);
          i += dk.length;
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      // Skip unrecognized Thai character
      i++;
    }
  }

  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  // Clean dangling "with" at end
  return joined.replace(/\bwith$/i, '').trim();
}

/**
 * Synchronous instant lookup using dictionary + ordered culinary tokens.
 * Useful as immediate preview or last-resort sync fallback.
 */
export function translateThaiToEnglishSync(thaiText: string): string {
  const trimmed = thaiText.trim();
  if (!trimmed) return '';
  if (!containsThai(trimmed)) return formatEnglishText(trimmed);

  const cached = translationCache.get(trimmed);
  if (cached) return cached;

  const normalizedKey = trimmed.toLowerCase();
  if (THAI_FOOD_DICTIONARY[normalizedKey]) {
    return THAI_FOOD_DICTIONARY[normalizedKey];
  }

  const strippedKey = normalizedKey.replace(/[\s\-_]+/g, '');
  if (THAI_FOOD_DICTIONARY[strippedKey]) {
    return THAI_FOOD_DICTIONARY[strippedKey];
  }

  const fallback = fallbackCulinaryTranslate(trimmed);
  return fallback ? formatEnglishText(fallback) : '';
}

/**
 * Translates Thai text to English.
 * 1. Checks in-memory cache and curated food dictionary first (instant & exact).
 * 2. Calls online neural translation API (MyMemory) with timeout & validation.
 * 3. If offline, rate-limited, or invalid/still-Thai response, uses ordered culinary token fallback.
 */
export async function translateThaiToEnglish(thaiText: string): Promise<string> {
  const trimmed = thaiText.trim();
  if (!trimmed) return '';

  // If the user already typed Latin/English text without any Thai, preserve it
  if (!containsThai(trimmed)) {
    return formatEnglishText(trimmed);
  }

  // 0. Cache check
  const cached = translationCache.get(trimmed);
  if (cached) {
    return cached;
  }

  // 1. Direct dictionary check
  const normalizedKey = trimmed.toLowerCase();
  if (THAI_FOOD_DICTIONARY[normalizedKey]) {
    const exact = THAI_FOOD_DICTIONARY[normalizedKey];
    translationCache.set(trimmed, exact);
    return exact;
  }

  const strippedKey = normalizedKey.replace(/[\s\-_]+/g, '');
  if (THAI_FOOD_DICTIONARY[strippedKey]) {
    const exact = THAI_FOOD_DICTIONARY[strippedKey];
    translationCache.set(trimmed, exact);
    return exact;
  }

  // 2. Online translation via MyMemory API with 4s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

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

      if (
        translated &&
        typeof translated === 'string' &&
        !translated.toUpperCase().includes('MYMEMORY WARNING') &&
        !translated.toUpperCase().includes('QUERY LENGTH LIMIT') &&
        !translated.toUpperCase().includes('INVALID') &&
        !containsThai(translated)
      ) {
        const formatted = formatEnglishText(translated);
        if (formatted) {
          translationCache.set(trimmed, formatted);
          return formatted;
        }
      }
    }
  } catch {
    // Network failure, timeout, or aborted - proceed to fallback
  }

  // 3. Ordered culinary token fallback
  const fallback = fallbackCulinaryTranslate(trimmed);
  if (fallback) {
    const formatted = formatEnglishText(fallback);
    if (formatted) {
      translationCache.set(trimmed, formatted);
      return formatted;
    }
  }

  return '';
}
