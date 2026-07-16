import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { foods, foodTranslations } from "./nutrition.db";

// Comprehensive food library. Macros = standard reference values per the serving in the name
// (USDA / common nutrition references + MyFitnessPal-style common foods). mealTypes are hints only.
// Categories: poultry/meat, fish, eggs/dairy, grains/starch, legumes, vegetables, fruits,
// nuts/fats, beverages, snacks/desserts, Middle-Eastern/Jordanian dishes, fast food, supplements.
type Seed = { name: string; ar: string; protein: number; carbs: number; fat: number; calories: number; mealTypes: string[] };

const FOODS: Seed[] = [
  // ── Poultry & Meat ─────────────────────────────────────────────────────────
  { name: "Chicken Breast (100g)", ar: "صدر دجاج (100غ)", protein: 31, carbs: 0, fat: 3.6, calories: 165, mealTypes: ["lunch", "dinner"] },
  { name: "Chicken Thigh (100g)", ar: "فخذ دجاج (100غ)", protein: 26, carbs: 0, fat: 10.9, calories: 209, mealTypes: ["lunch", "dinner"] },
  { name: "Ground Beef 90% (100g)", ar: "لحم بقري مفروم 90% (100غ)", protein: 20, carbs: 0, fat: 10, calories: 176, mealTypes: ["lunch", "dinner"] },
  { name: "Beef Steak (100g)", ar: "ستيك لحم بقري (100غ)", protein: 25, carbs: 0, fat: 15, calories: 250, mealTypes: ["lunch", "dinner"] },
  { name: "Lamb (100g)", ar: "لحم خروف (100غ)", protein: 25, carbs: 0, fat: 21, calories: 294, mealTypes: ["lunch", "dinner"] },
  { name: "Turkey Breast (100g)", ar: "صدر ديك رومي (100غ)", protein: 29, carbs: 0, fat: 1, calories: 135, mealTypes: ["lunch", "dinner"] },

  // ── Fish & Seafood ─────────────────────────────────────────────────────────
  { name: "Salmon (100g)", ar: "سلمون (100غ)", protein: 20, carbs: 0, fat: 13, calories: 208, mealTypes: ["lunch", "dinner"] },
  { name: "Tuna (100g)", ar: "تونة (100غ)", protein: 30, carbs: 0, fat: 1, calories: 132, mealTypes: ["lunch", "dinner"] },
  { name: "Canned Tuna in Water (100g)", ar: "تونة معلبة بالماء (100غ)", protein: 25, carbs: 0, fat: 1, calories: 116, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Shrimp (100g)", ar: "روبيان (100غ)", protein: 24, carbs: 0.2, fat: 0.3, calories: 99, mealTypes: ["lunch", "dinner"] },
  { name: "Tilapia (100g)", ar: "بلطي (100غ)", protein: 26, carbs: 0, fat: 2.7, calories: 128, mealTypes: ["lunch", "dinner"] },
  { name: "Sardines (100g)", ar: "سردين (100غ)", protein: 25, carbs: 0, fat: 11, calories: 208, mealTypes: ["lunch", "dinner", "snack"] },

  // ── Eggs & Dairy ───────────────────────────────────────────────────────────
  { name: "Eggs (1 large)", ar: "بيضة (كبيرة)", protein: 6, carbs: 0.6, fat: 5, calories: 72, mealTypes: ["breakfast", "snack"] },
  { name: "Egg White (1 large)", ar: "بياض بيضة (كبيرة)", protein: 3.6, carbs: 0.2, fat: 0.1, calories: 17, mealTypes: ["breakfast", "snack"] },
  { name: "Milk (250ml)", ar: "حليب (250مل)", protein: 8, carbs: 12, fat: 8, calories: 149, mealTypes: ["breakfast", "drink"] },
  { name: "Greek Yogurt (100g)", ar: "زبادي يوناني (100غ)", protein: 10, carbs: 3.6, fat: 0.7, calories: 59, mealTypes: ["breakfast", "snack"] },
  { name: "Plain Yogurt (100g)", ar: "لبن زبادي (100غ)", protein: 3.5, carbs: 4.7, fat: 3.3, calories: 61, mealTypes: ["breakfast", "snack"] },
  { name: "Labneh (100g)", ar: "لبنة (100غ)", protein: 8, carbs: 5, fat: 9, calories: 130, mealTypes: ["breakfast", "snack"] },
  { name: "Cheddar Cheese (30g)", ar: "جبنة شيدر (30غ)", protein: 7, carbs: 0.4, fat: 9, calories: 120, mealTypes: ["breakfast", "snack"] },
  { name: "Halloumi Cheese (30g)", ar: "جبنة حلوم (30غ)", protein: 6, carbs: 0.5, fat: 6, calories: 80, mealTypes: ["breakfast", "snack"] },
  { name: "Cottage Cheese (100g)", ar: "جبنة قريش (100غ)", protein: 11, carbs: 3.4, fat: 4.3, calories: 98, mealTypes: ["breakfast", "snack"] },
  { name: "Feta Cheese (30g)", ar: "جبنة فيتا (30غ)", protein: 4, carbs: 1.2, fat: 6, calories: 79, mealTypes: ["breakfast", "snack"] },
  { name: "Butter (1 tbsp)", ar: "زبدة (ملعقة كبيرة)", protein: 0.1, carbs: 0, fat: 11, calories: 100, mealTypes: ["breakfast"] },

  // ── Grains & Starches ──────────────────────────────────────────────────────
  { name: "White Rice (100g)", ar: "أرز أبيض (100غ)", protein: 2.7, carbs: 28, fat: 0.3, calories: 130, mealTypes: ["lunch", "dinner"] },
  { name: "Brown Rice (100g)", ar: "أرز بني (100غ)", protein: 2.6, carbs: 23, fat: 0.9, calories: 112, mealTypes: ["lunch", "dinner"] },
  { name: "Oats (100g)", ar: "شوفان (100غ)", protein: 13, carbs: 66, fat: 7, calories: 389, mealTypes: ["breakfast"] },
  { name: "Whole Wheat Bread (1 slice)", ar: "خبز قمح كامل (شريحة)", protein: 4, carbs: 12, fat: 1, calories: 80, mealTypes: ["breakfast", "snack"] },
  { name: "White Bread (1 slice)", ar: "خبز أبيض (شريحة)", protein: 2.6, carbs: 13, fat: 1, calories: 75, mealTypes: ["breakfast", "snack"] },
  { name: "Arabic Pita Bread (1 loaf)", ar: "خبز عربي (رغيف)", protein: 9, carbs: 56, fat: 1.5, calories: 275, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Pasta cooked (100g)", ar: "معكرونة مطبوخة (100غ)", protein: 5, carbs: 25, fat: 1.1, calories: 131, mealTypes: ["lunch", "dinner"] },
  { name: "Potato (100g)", ar: "بطاطا (100غ)", protein: 2, carbs: 17, fat: 0.1, calories: 77, mealTypes: ["lunch", "dinner"] },
  { name: "Sweet Potato (100g)", ar: "بطاطا حلوة (100غ)", protein: 1.6, carbs: 20, fat: 0.1, calories: 86, mealTypes: ["lunch", "dinner"] },
  { name: "Quinoa cooked (100g)", ar: "كينوا مطبوخة (100غ)", protein: 4.4, carbs: 21, fat: 1.9, calories: 120, mealTypes: ["lunch", "dinner"] },
  { name: "Couscous cooked (100g)", ar: "كسكس مطبوخ (100غ)", protein: 3.8, carbs: 23, fat: 0.2, calories: 112, mealTypes: ["lunch", "dinner"] },
  { name: "Bulgur cooked (100g)", ar: "برغل مطبوخ (100غ)", protein: 3, carbs: 19, fat: 0.2, calories: 83, mealTypes: ["lunch", "dinner"] },
  { name: "Corn Flakes (30g)", ar: "رقائق الذرة (30غ)", protein: 2, carbs: 25, fat: 0.1, calories: 110, mealTypes: ["breakfast"] },

  // ── Legumes ────────────────────────────────────────────────────────────────
  { name: "Lentils cooked (100g)", ar: "عدس مطبوخ (100غ)", protein: 9, carbs: 20, fat: 0.4, calories: 116, mealTypes: ["lunch", "dinner"] },
  { name: "Chickpeas cooked (100g)", ar: "حمص مسلوق (100غ)", protein: 9, carbs: 27, fat: 2.6, calories: 164, mealTypes: ["lunch", "dinner"] },
  { name: "Hummus (100g)", ar: "حمص بطحينة (100غ)", protein: 8, carbs: 14, fat: 10, calories: 177, mealTypes: ["breakfast", "snack"] },
  { name: "Foul Medames (100g)", ar: "فول مدمس (100غ)", protein: 8, carbs: 12, fat: 3, calories: 130, mealTypes: ["breakfast"] },
  { name: "Falafel (100g)", ar: "فلافل (100غ)", protein: 13, carbs: 32, fat: 18, calories: 333, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Kidney Beans cooked (100g)", ar: "فاصولياء حمراء مطبوخة (100غ)", protein: 9, carbs: 22, fat: 0.5, calories: 127, mealTypes: ["lunch", "dinner"] },
  { name: "Green Peas (100g)", ar: "بازيلاء (100غ)", protein: 5, carbs: 14, fat: 0.4, calories: 81, mealTypes: ["lunch", "dinner"] },

  // ── Vegetables ─────────────────────────────────────────────────────────────
  { name: "Broccoli (100g)", ar: "بروكلي (100غ)", protein: 2.8, carbs: 7, fat: 0.4, calories: 34, mealTypes: ["lunch", "dinner"] },
  { name: "Spinach (100g)", ar: "سبانخ (100غ)", protein: 2.9, carbs: 3.6, fat: 0.4, calories: 23, mealTypes: ["lunch", "dinner"] },
  { name: "Tomato (100g)", ar: "بندورة (100غ)", protein: 0.9, carbs: 3.9, fat: 0.2, calories: 18, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Cucumber (100g)", ar: "خيار (100غ)", protein: 0.7, carbs: 3.6, fat: 0.1, calories: 15, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Carrot (100g)", ar: "جزر (100غ)", protein: 0.9, carbs: 10, fat: 0.2, calories: 41, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Mixed Green Salad (100g)", ar: "سلطة خضراء (100غ)", protein: 1.5, carbs: 3, fat: 0.2, calories: 20, mealTypes: ["lunch", "dinner"] },
  { name: "Onion (100g)", ar: "بصل (100غ)", protein: 1.1, carbs: 9, fat: 0.1, calories: 40, mealTypes: ["lunch", "dinner"] },
  { name: "Bell Pepper (100g)", ar: "فلفل حلو (100غ)", protein: 1, carbs: 6, fat: 0.3, calories: 31, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Eggplant (100g)", ar: "باذنجان (100غ)", protein: 1, carbs: 6, fat: 0.2, calories: 25, mealTypes: ["lunch", "dinner"] },
  { name: "Zucchini (100g)", ar: "كوسا (100غ)", protein: 1.2, carbs: 3.1, fat: 0.3, calories: 17, mealTypes: ["lunch", "dinner"] },

  // ── Fruits ─────────────────────────────────────────────────────────────────
  { name: "Banana (1 medium)", ar: "موزة (متوسطة)", protein: 1.3, carbs: 27, fat: 0.4, calories: 105, mealTypes: ["breakfast", "snack", "pre_workout"] },
  { name: "Apple (1 medium)", ar: "تفاحة (متوسطة)", protein: 0.5, carbs: 25, fat: 0.3, calories: 95, mealTypes: ["snack"] },
  { name: "Orange (1 medium)", ar: "برتقالة (متوسطة)", protein: 1.2, carbs: 15, fat: 0.2, calories: 62, mealTypes: ["breakfast", "snack"] },
  { name: "Dates (2 pieces)", ar: "تمر (حبتان)", protein: 0.4, carbs: 18, fat: 0, calories: 66, mealTypes: ["snack", "pre_workout"] },
  { name: "Grapes (100g)", ar: "عنب (100غ)", protein: 0.7, carbs: 18, fat: 0.2, calories: 69, mealTypes: ["snack"] },
  { name: "Watermelon (100g)", ar: "بطيخ (100غ)", protein: 0.6, carbs: 8, fat: 0.2, calories: 30, mealTypes: ["snack", "dessert"] },
  { name: "Mango (100g)", ar: "مانجا (100غ)", protein: 0.8, carbs: 15, fat: 0.4, calories: 60, mealTypes: ["snack", "dessert"] },
  { name: "Strawberries (100g)", ar: "فراولة (100غ)", protein: 0.7, carbs: 8, fat: 0.3, calories: 32, mealTypes: ["snack", "dessert"] },
  { name: "Blueberries (100g)", ar: "توت أزرق (100غ)", protein: 0.7, carbs: 14, fat: 0.3, calories: 57, mealTypes: ["breakfast", "snack"] },
  { name: "Pomegranate (100g)", ar: "رمان (100غ)", protein: 1.7, carbs: 19, fat: 1.2, calories: 83, mealTypes: ["snack"] },
  { name: "Pineapple (100g)", ar: "أناناس (100غ)", protein: 0.5, carbs: 13, fat: 0.1, calories: 50, mealTypes: ["snack", "dessert"] },
  { name: "Avocado (1 medium)", ar: "أفوكادو (متوسطة)", protein: 3, carbs: 12, fat: 21, calories: 240, mealTypes: ["breakfast", "snack"] },

  // ── Nuts, Seeds & Fats ─────────────────────────────────────────────────────
  { name: "Almonds (30g)", ar: "لوز (30غ)", protein: 6, carbs: 6, fat: 14, calories: 164, mealTypes: ["snack"] },
  { name: "Walnuts (30g)", ar: "جوز (30غ)", protein: 4.3, carbs: 4, fat: 18, calories: 185, mealTypes: ["snack"] },
  { name: "Cashews (30g)", ar: "كاجو (30غ)", protein: 5, carbs: 9, fat: 12, calories: 157, mealTypes: ["snack"] },
  { name: "Peanuts (30g)", ar: "فول سوداني (30غ)", protein: 7, carbs: 5, fat: 14, calories: 161, mealTypes: ["snack"] },
  { name: "Peanut Butter (2 tbsp)", ar: "زبدة الفول السوداني (ملعقتان)", protein: 8, carbs: 6, fat: 16, calories: 190, mealTypes: ["breakfast", "snack"] },
  { name: "Pistachios (30g)", ar: "فستق حلبي (30غ)", protein: 6, carbs: 8, fat: 13, calories: 159, mealTypes: ["snack"] },
  { name: "Tahini (1 tbsp)", ar: "طحينة (ملعقة كبيرة)", protein: 2.6, carbs: 3.2, fat: 8, calories: 89, mealTypes: ["snack"] },
  { name: "Olive Oil (1 tbsp)", ar: "زيت زيتون (ملعقة كبيرة)", protein: 0, carbs: 0, fat: 14, calories: 119, mealTypes: ["lunch", "dinner"] },
  { name: "Chia Seeds (1 tbsp)", ar: "بذور الشيا (ملعقة كبيرة)", protein: 2, carbs: 5, fat: 4, calories: 58, mealTypes: ["breakfast"] },

  // ── Beverages ──────────────────────────────────────────────────────────────
  { name: "Water (250ml)", ar: "ماء (250مل)", protein: 0, carbs: 0, fat: 0, calories: 0, mealTypes: ["drink"] },
  { name: "Black Coffee (1 cup)", ar: "قهوة سوداء (كوب)", protein: 0.3, carbs: 0, fat: 0, calories: 2, mealTypes: ["breakfast", "drink"] },
  { name: "Tea unsweetened (1 cup)", ar: "شاي بدون سكر (كوب)", protein: 0, carbs: 0.3, fat: 0, calories: 2, mealTypes: ["drink"] },
  { name: "Orange Juice (250ml)", ar: "عصير برتقال (250مل)", protein: 1.7, carbs: 26, fat: 0.5, calories: 112, mealTypes: ["breakfast", "drink"] },
  { name: "Cola (330ml)", ar: "كولا (330مل)", protein: 0, carbs: 35, fat: 0, calories: 139, mealTypes: ["drink"] },
  { name: "Ayran / Laban (250ml)", ar: "عيران / لبن (250مل)", protein: 8, carbs: 10, fat: 4, calories: 110, mealTypes: ["drink", "lunch"] },
  { name: "Latte (250ml)", ar: "لاتيه (250مل)", protein: 8, carbs: 12, fat: 8, calories: 150, mealTypes: ["breakfast", "drink"] },

  // ── Snacks, Sweets & Desserts ──────────────────────────────────────────────
  { name: "Dark Chocolate (30g)", ar: "شوكولاتة داكنة (30غ)", protein: 2.2, carbs: 13, fat: 13, calories: 180, mealTypes: ["snack", "dessert"] },
  { name: "Milk Chocolate (30g)", ar: "شوكولاتة بالحليب (30غ)", protein: 2, carbs: 17, fat: 9, calories: 155, mealTypes: ["snack", "dessert"] },
  { name: "Potato Chips (30g)", ar: "رقائق البطاطا (30غ)", protein: 2, carbs: 15, fat: 10, calories: 152, mealTypes: ["snack"] },
  { name: "Ice Cream (100g)", ar: "آيس كريم (100غ)", protein: 3.5, carbs: 24, fat: 11, calories: 207, mealTypes: ["dessert"] },
  { name: "Plain Biscuit (2 pieces)", ar: "بسكويت سادة (حبتان)", protein: 1.5, carbs: 14, fat: 3, calories: 90, mealTypes: ["snack"] },
  { name: "Honey (1 tbsp)", ar: "عسل (ملعقة كبيرة)", protein: 0.1, carbs: 17, fat: 0, calories: 64, mealTypes: ["breakfast"] },
  { name: "Granola Bar (1 bar)", ar: "لوح غرانولا (قطعة)", protein: 4, carbs: 29, fat: 6, calories: 180, mealTypes: ["snack", "pre_workout"] },
  { name: "Knafeh (100g)", ar: "كنافة (100غ)", protein: 6, carbs: 40, fat: 15, calories: 330, mealTypes: ["dessert"] },
  { name: "Baklava (1 piece)", ar: "بقلاوة (قطعة)", protein: 3, carbs: 18, fat: 12, calories: 200, mealTypes: ["dessert"] },

  // ── Middle-Eastern / Jordanian dishes ──────────────────────────────────────
  { name: "Mansaf (1 plate)", ar: "منسف (طبق)", protein: 35, carbs: 55, fat: 40, calories: 700, mealTypes: ["lunch", "dinner"] },
  { name: "Maqluba (1 plate)", ar: "مقلوبة (طبق)", protein: 18, carbs: 60, fat: 20, calories: 480, mealTypes: ["lunch", "dinner"] },
  { name: "Musakhan (1 plate)", ar: "مسخن (طبق)", protein: 30, carbs: 45, fat: 30, calories: 560, mealTypes: ["lunch", "dinner"] },
  { name: "Tabbouleh (100g)", ar: "تبولة (100غ)", protein: 2, carbs: 12, fat: 7, calories: 120, mealTypes: ["lunch", "dinner"] },
  { name: "Fattoush (100g)", ar: "فتوش (100غ)", protein: 1.5, carbs: 9, fat: 6, calories: 95, mealTypes: ["lunch", "dinner"] },
  { name: "Chicken Shawarma Wrap (1 wrap)", ar: "شاورما دجاج (سندويش)", protein: 25, carbs: 45, fat: 22, calories: 470, mealTypes: ["lunch", "dinner"] },
  { name: "Grilled Kebab (100g)", ar: "كباب مشوي (100غ)", protein: 18, carbs: 2, fat: 15, calories: 215, mealTypes: ["lunch", "dinner"] },
  { name: "Manakish Zaatar (1 piece)", ar: "مناقيش زعتر (قطعة)", protein: 8, carbs: 40, fat: 14, calories: 300, mealTypes: ["breakfast"] },
  { name: "Stuffed Grape Leaves (100g)", ar: "ورق عنب (100غ)", protein: 3, carbs: 20, fat: 6, calories: 140, mealTypes: ["lunch", "dinner"] },
  { name: "Shakshuka (1 plate)", ar: "شكشوكة (طبق)", protein: 13, carbs: 10, fat: 14, calories: 220, mealTypes: ["breakfast"] },

  // ── Fast Food ──────────────────────────────────────────────────────────────
  { name: "Beef Burger (1)", ar: "برغر لحم (واحد)", protein: 25, carbs: 40, fat: 30, calories: 520, mealTypes: ["lunch", "dinner"] },
  { name: "Cheese Pizza (1 slice)", ar: "بيتزا بالجبنة (شريحة)", protein: 11, carbs: 33, fat: 10, calories: 272, mealTypes: ["lunch", "dinner"] },
  { name: "Fried Chicken (1 piece)", ar: "دجاج مقلي (قطعة)", protein: 22, carbs: 8, fat: 15, calories: 260, mealTypes: ["lunch", "dinner"] },
  { name: "French Fries (100g)", ar: "بطاطا مقلية (100غ)", protein: 3.4, carbs: 41, fat: 15, calories: 312, mealTypes: ["lunch", "dinner", "snack"] },

  // ── Supplements ────────────────────────────────────────────────────────────
  { name: "Whey Protein (1 scoop)", ar: "بروتين مصل اللبن (مغرفة)", protein: 25, carbs: 3, fat: 1, calories: 120, mealTypes: ["post_workout"] },
  { name: "Protein Shake (1 serving)", ar: "مخفوق بروتين (حصة)", protein: 25, carbs: 5, fat: 2, calories: 140, mealTypes: ["post_workout", "drink"] },
  { name: "Protein Bar (1 bar)", ar: "لوح بروتين (قطعة)", protein: 20, carbs: 22, fat: 7, calories: 220, mealTypes: ["snack", "post_workout"] },
  { name: "Mass Gainer (1 serving)", ar: "مكمل زيادة الوزن (حصة)", protein: 50, carbs: 250, fat: 5, calories: 1250, mealTypes: ["post_workout"] },
  { name: "Creatine (5g)", ar: "كرياتين (5غ)", protein: 0, carbs: 0, fat: 0, calories: 0, mealTypes: ["pre_workout", "post_workout"] },
  { name: "BCAA (1 serving)", ar: "أحماض أمينية متشعبة (حصة)", protein: 0, carbs: 0, fat: 0, calories: 5, mealTypes: ["pre_workout", "post_workout"] },

  // ── More dairy & cheeses (Levantine) ───────────────────────────────────────
  { name: "White Cheese / Akkawi (30g)", ar: "جبنة بيضاء (عكاوي) (30غ)", protein: 5, carbs: 1, fat: 5, calories: 70, mealTypes: ["breakfast", "snack"] },
  { name: "Nabulsi Cheese (30g)", ar: "جبنة نابلسية (30غ)", protein: 6, carbs: 1, fat: 6, calories: 90, mealTypes: ["breakfast", "snack"] },
  { name: "Kashkaval Cheese (30g)", ar: "جبنة قشقوان (30غ)", protein: 8, carbs: 0.5, fat: 9.6, calories: 118, mealTypes: ["breakfast", "snack"] },
  { name: "Cream Cheese (30g)", ar: "جبنة كريمية (30غ)", protein: 2, carbs: 1.5, fat: 10, calories: 100, mealTypes: ["breakfast", "snack"] },
  { name: "Mozzarella Cheese (30g)", ar: "جبنة موزاريلا (30غ)", protein: 6, carbs: 1, fat: 6, calories: 85, mealTypes: ["breakfast", "lunch", "dinner", "snack"] },
  { name: "Cheese Triangle (1 portion)", ar: "جبنة مثلثات (قطعة)", protein: 2, carbs: 1, fat: 5, calories: 65, mealTypes: ["breakfast", "snack"] },
  { name: "Shanklish (30g)", ar: "شنكليش (30غ)", protein: 7, carbs: 2, fat: 8, calories: 110, mealTypes: ["breakfast", "snack"] },
  { name: "Kishk (100g)", ar: "كشك (100غ)", protein: 14, carbs: 55, fat: 5, calories: 320, mealTypes: ["breakfast"] },
  { name: "Jameed (100g)", ar: "جميد (100غ)", protein: 11, carbs: 12, fat: 8, calories: 170, mealTypes: ["lunch", "dinner"] },

  // ── More Middle-Eastern / Jordanian dishes ─────────────────────────────────
  { name: "Mujadara (1 plate)", ar: "مجدرة (طبق)", protein: 10, carbs: 50, fat: 10, calories: 320, mealTypes: ["lunch", "dinner"] },
  { name: "Fried Kibbeh (2 pieces)", ar: "كبة مقلية (حبتان)", protein: 9, carbs: 19, fat: 12, calories: 220, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Shish Tawook (100g)", ar: "شيش طاووق (100غ)", protein: 28, carbs: 3, fat: 7, calories: 190, mealTypes: ["lunch", "dinner"] },
  { name: "Fatteh (1 bowl)", ar: "فتة (وعاء)", protein: 12, carbs: 40, fat: 25, calories: 450, mealTypes: ["breakfast", "lunch"] },
  { name: "Cheese Sambousek (2 pieces)", ar: "سمبوسك جبنة (حبتان)", protein: 6, carbs: 24, fat: 10, calories: 210, mealTypes: ["snack", "lunch", "dinner"] },
  { name: "Meat Sambousek (2 pieces)", ar: "سمبوسك لحمة (حبتان)", protein: 9, carbs: 24, fat: 12, calories: 250, mealTypes: ["snack", "lunch", "dinner"] },
  { name: "Freekeh cooked (100g)", ar: "فريكة مطبوخة (100غ)", protein: 5, carbs: 26, fat: 1, calories: 140, mealTypes: ["lunch", "dinner"] },
  { name: "Mutabbal / Baba Ghanoush (100g)", ar: "متبل / بابا غنوج (100غ)", protein: 3, carbs: 9, fat: 12, calories: 150, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Lentil Soup (1 bowl)", ar: "شوربة عدس (وعاء)", protein: 9, carbs: 25, fat: 4, calories: 180, mealTypes: ["lunch", "dinner"] },
  { name: "Molokhia (1 plate)", ar: "ملوخية (طبق)", protein: 14, carbs: 18, fat: 12, calories: 260, mealTypes: ["lunch", "dinner"] },
  { name: "Okra Stew / Bamia (1 plate)", ar: "بامية (طبق)", protein: 10, carbs: 20, fat: 12, calories: 240, mealTypes: ["lunch", "dinner"] },
  { name: "Green Bean Stew / Fasolia (1 plate)", ar: "يخنة فاصولياء (طبق)", protein: 9, carbs: 22, fat: 12, calories: 230, mealTypes: ["lunch", "dinner"] },
  { name: "Kabsa (1 plate)", ar: "كبسة (طبق)", protein: 28, carbs: 65, fat: 18, calories: 540, mealTypes: ["lunch", "dinner"] },
  { name: "Sayadieh (1 plate)", ar: "صيادية (طبق)", protein: 25, carbs: 60, fat: 15, calories: 480, mealTypes: ["lunch", "dinner"] },
  { name: "Ouzi (1 plate)", ar: "أوزي (طبق)", protein: 22, carbs: 60, fat: 22, calories: 520, mealTypes: ["lunch", "dinner"] },
  { name: "Kofta (100g)", ar: "كفتة (100غ)", protein: 17, carbs: 3, fat: 18, calories: 240, mealTypes: ["lunch", "dinner"] },
  { name: "Arayes (1 piece)", ar: "عرايس (قطعة)", protein: 12, carbs: 25, fat: 14, calories: 270, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Cheese Fatayer (1 piece)", ar: "فطاير جبنة (قطعة)", protein: 7, carbs: 28, fat: 9, calories: 220, mealTypes: ["breakfast", "snack"] },
  { name: "Spinach Fatayer (1 piece)", ar: "فطاير سبانخ (قطعة)", protein: 5, carbs: 26, fat: 8, calories: 190, mealTypes: ["breakfast", "snack"] },
  { name: "Galayet Bandora (1 plate)", ar: "قلاية بندورة (طبق)", protein: 5, carbs: 15, fat: 12, calories: 190, mealTypes: ["breakfast", "lunch"] },

  // ── More sweets & desserts ─────────────────────────────────────────────────
  { name: "Maamoul (1 piece)", ar: "معمول (قطعة)", protein: 2, carbs: 20, fat: 6, calories: 140, mealTypes: ["dessert", "snack"] },
  { name: "Qatayef (1 piece)", ar: "قطايف (قطعة)", protein: 3, carbs: 22, fat: 8, calories: 170, mealTypes: ["dessert"] },
  { name: "Basbousa (1 piece)", ar: "بسبوسة (قطعة)", protein: 3, carbs: 30, fat: 9, calories: 220, mealTypes: ["dessert"] },
  { name: "Luqaimat / Awameh (5 pieces)", ar: "لقيمات / عوامة (5 حبات)", protein: 3, carbs: 35, fat: 10, calories: 250, mealTypes: ["dessert"] },
  { name: "Halawa / Halva (30g)", ar: "حلاوة طحينية (30غ)", protein: 4, carbs: 18, fat: 9, calories: 160, mealTypes: ["dessert", "snack"] },
  { name: "Muhallabia (1 cup)", ar: "مهلبية (كوب)", protein: 4, carbs: 25, fat: 5, calories: 150, mealTypes: ["dessert"] },
  { name: "Rice Pudding (1 cup)", ar: "أرز بالحليب (كوب)", protein: 5, carbs: 30, fat: 6, calories: 190, mealTypes: ["dessert"] },
  { name: "Stuffed Dates (3 pieces)", ar: "تمر محشي (3 حبات)", protein: 2, carbs: 30, fat: 8, calories: 200, mealTypes: ["snack", "dessert"] },

  // ── More fruits ────────────────────────────────────────────────────────────
  { name: "Peach (1 medium)", ar: "خوخة (متوسطة)", protein: 1, carbs: 15, fat: 0.4, calories: 59, mealTypes: ["snack"] },
  { name: "Pear (1 medium)", ar: "إجاصة (متوسطة)", protein: 0.6, carbs: 27, fat: 0.2, calories: 101, mealTypes: ["snack"] },
  { name: "Kiwi (1 medium)", ar: "كيوي (حبة)", protein: 0.8, carbs: 10, fat: 0.4, calories: 42, mealTypes: ["snack"] },
  { name: "Cherries (100g)", ar: "كرز (100غ)", protein: 1, carbs: 16, fat: 0.3, calories: 63, mealTypes: ["snack"] },
  { name: "Figs (2 medium)", ar: "تين (حبتان)", protein: 0.6, carbs: 19, fat: 0.3, calories: 74, mealTypes: ["snack"] },
  { name: "Apricots (3 medium)", ar: "مشمش (3 حبات)", protein: 1.4, carbs: 11, fat: 0.4, calories: 48, mealTypes: ["snack"] },
  { name: "Guava (100g)", ar: "جوافة (100غ)", protein: 2.6, carbs: 14, fat: 1, calories: 68, mealTypes: ["snack"] },

  // ── More vegetables ────────────────────────────────────────────────────────
  { name: "Cauliflower (100g)", ar: "قرنبيط (100غ)", protein: 1.9, carbs: 5, fat: 0.3, calories: 25, mealTypes: ["lunch", "dinner"] },
  { name: "Green Beans (100g)", ar: "فاصولياء خضراء (100غ)", protein: 1.8, carbs: 7, fat: 0.2, calories: 31, mealTypes: ["lunch", "dinner"] },
  { name: "Mushrooms (100g)", ar: "فطر (100غ)", protein: 3.1, carbs: 3.3, fat: 0.3, calories: 22, mealTypes: ["lunch", "dinner"] },
  { name: "Cabbage (100g)", ar: "ملفوف (100غ)", protein: 1.3, carbs: 6, fat: 0.1, calories: 25, mealTypes: ["lunch", "dinner"] },
  { name: "Lettuce (100g)", ar: "خس (100غ)", protein: 1.4, carbs: 2.9, fat: 0.2, calories: 15, mealTypes: ["lunch", "dinner"] },
  { name: "Beetroot (100g)", ar: "شمندر (100غ)", protein: 1.6, carbs: 10, fat: 0.2, calories: 43, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Corn (100g)", ar: "ذرة (100غ)", protein: 3.4, carbs: 19, fat: 1.5, calories: 96, mealTypes: ["lunch", "dinner", "snack"] },

  // ── More proteins ──────────────────────────────────────────────────────────
  { name: "Boiled Egg (1 large)", ar: "بيضة مسلوقة (كبيرة)", protein: 6, carbs: 0.6, fat: 5, calories: 78, mealTypes: ["breakfast", "snack"] },
  { name: "Egg Omelette (2 eggs)", ar: "عجة بيض (بيضتان)", protein: 13, carbs: 2, fat: 15, calories: 200, mealTypes: ["breakfast"] },
  { name: "Mackerel (100g)", ar: "ماكريل (100غ)", protein: 19, carbs: 0, fat: 14, calories: 205, mealTypes: ["lunch", "dinner"] },
  { name: "Cod (100g)", ar: "سمك القد (100غ)", protein: 18, carbs: 0, fat: 0.7, calories: 82, mealTypes: ["lunch", "dinner"] },
  { name: "Chicken Liver (100g)", ar: "كبد دجاج (100غ)", protein: 17, carbs: 1, fat: 5, calories: 119, mealTypes: ["lunch", "dinner"] },
  { name: "Turkey Deli Slice (30g)", ar: "شرائح ديك رومي (30غ)", protein: 5, carbs: 1, fat: 1, calories: 35, mealTypes: ["breakfast", "snack"] },
  { name: "Tofu (100g)", ar: "توفو (100غ)", protein: 8, carbs: 2, fat: 4, calories: 76, mealTypes: ["lunch", "dinner"] },
  { name: "Edamame (100g)", ar: "إدامامي (100غ)", protein: 11, carbs: 9, fat: 5, calories: 122, mealTypes: ["snack", "lunch"] },
  { name: "White Beans (100g)", ar: "فاصولياء بيضاء (100غ)", protein: 9, carbs: 25, fat: 0.6, calories: 139, mealTypes: ["lunch", "dinner"] },

  // ── More grains & starches ─────────────────────────────────────────────────
  { name: "Macaroni Bechamel (1 plate)", ar: "مكرونة بشاميل (طبق)", protein: 15, carbs: 45, fat: 22, calories: 450, mealTypes: ["lunch", "dinner"] },
  { name: "Croissant (1)", ar: "كرواسون (واحد)", protein: 5, carbs: 26, fat: 12, calories: 230, mealTypes: ["breakfast"] },
  { name: "Bagel (1)", ar: "خبز بيغل (واحد)", protein: 9, carbs: 48, fat: 1.5, calories: 245, mealTypes: ["breakfast"] },
  { name: "Popcorn (1 cup)", ar: "فشار (كوب)", protein: 1, carbs: 6, fat: 0.4, calories: 31, mealTypes: ["snack"] },
  { name: "Rice Cake (1)", ar: "كعكة أرز (واحدة)", protein: 0.7, carbs: 7, fat: 0.3, calories: 35, mealTypes: ["snack"] },
  { name: "Tortilla Wrap (1)", ar: "خبز تورتيلا (رغيف)", protein: 4, carbs: 24, fat: 3.5, calories: 140, mealTypes: ["lunch", "dinner"] },

  // ── More nuts & seeds ──────────────────────────────────────────────────────
  { name: "Hazelnuts (30g)", ar: "بندق (30غ)", protein: 4.5, carbs: 5, fat: 17, calories: 178, mealTypes: ["snack"] },
  { name: "Sunflower Seeds (30g)", ar: "بذور دوّار الشمس (30غ)", protein: 6, carbs: 6, fat: 14, calories: 165, mealTypes: ["snack"] },
  { name: "Pumpkin Seeds (30g)", ar: "بذور اليقطين (30غ)", protein: 9, carbs: 3, fat: 14, calories: 170, mealTypes: ["snack"] },
  { name: "Mixed Nuts (30g)", ar: "مكسرات مشكّلة (30غ)", protein: 5, carbs: 6, fat: 15, calories: 170, mealTypes: ["snack"] },

  // ── More beverages ─────────────────────────────────────────────────────────
  { name: "Green Tea (1 cup)", ar: "شاي أخضر (كوب)", protein: 0, carbs: 0, fat: 0, calories: 2, mealTypes: ["drink"] },
  { name: "Turkish Coffee (1 cup)", ar: "قهوة تركية (كوب)", protein: 0.2, carbs: 2, fat: 0, calories: 10, mealTypes: ["drink"] },
  { name: "Cappuccino (1 cup)", ar: "كابتشينو (كوب)", protein: 6, carbs: 9, fat: 5, calories: 110, mealTypes: ["breakfast", "drink"] },
  { name: "Mango Juice (250ml)", ar: "عصير مانجا (250مل)", protein: 1, carbs: 30, fat: 0.5, calories: 130, mealTypes: ["drink"] },
  { name: "Lemonade (250ml)", ar: "عصير ليمون (250مل)", protein: 0.2, carbs: 26, fat: 0, calories: 99, mealTypes: ["drink"] },
  { name: "Milkshake (300ml)", ar: "ميلك شيك (300مل)", protein: 8, carbs: 45, fat: 10, calories: 300, mealTypes: ["drink", "dessert"] },
  { name: "Smoothie (300ml)", ar: "سموذي (300مل)", protein: 5, carbs: 40, fat: 2, calories: 190, mealTypes: ["breakfast", "drink", "snack"] },
  { name: "Sports Drink (500ml)", ar: "مشروب رياضي (500مل)", protein: 0, carbs: 32, fat: 0, calories: 125, mealTypes: ["drink", "pre_workout"] },
  { name: "Energy Drink (250ml)", ar: "مشروب طاقة (250مل)", protein: 0, carbs: 28, fat: 0, calories: 112, mealTypes: ["drink", "pre_workout"] },
  { name: "Sahlab (1 cup)", ar: "سحلب (كوب)", protein: 5, carbs: 30, fat: 6, calories: 190, mealTypes: ["drink", "dessert"] },

  // ── Spreads & condiments ───────────────────────────────────────────────────
  { name: "Garlic Sauce / Toum (1 tbsp)", ar: "ثومية (ملعقة كبيرة)", protein: 0.2, carbs: 1, fat: 12, calories: 110, mealTypes: ["lunch", "dinner"] },
  { name: "Mayonnaise (1 tbsp)", ar: "مايونيز (ملعقة كبيرة)", protein: 0.1, carbs: 0.1, fat: 10, calories: 94, mealTypes: ["lunch", "dinner"] },
  { name: "Ketchup (1 tbsp)", ar: "كاتشب (ملعقة كبيرة)", protein: 0.2, carbs: 5, fat: 0, calories: 20, mealTypes: ["lunch", "dinner"] },
  { name: "Jam (1 tbsp)", ar: "مربى (ملعقة كبيرة)", protein: 0.1, carbs: 13, fat: 0, calories: 50, mealTypes: ["breakfast"] },
  { name: "Chocolate Spread (1 tbsp)", ar: "شوكولاتة قابلة للدهن (ملعقة كبيرة)", protein: 1, carbs: 12, fat: 6, calories: 100, mealTypes: ["breakfast", "snack", "dessert"] },
  { name: "Date Molasses / Dibs (1 tbsp)", ar: "دبس التمر (ملعقة كبيرة)", protein: 0.3, carbs: 16, fat: 0, calories: 62, mealTypes: ["breakfast"] },

  // ── More fast food ─────────────────────────────────────────────────────────
  { name: "Hot Dog (1)", ar: "هوت دوغ (واحد)", protein: 10, carbs: 18, fat: 15, calories: 250, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Club Sandwich (1)", ar: "كلوب ساندويتش (واحد)", protein: 25, carbs: 40, fat: 25, calories: 500, mealTypes: ["lunch", "dinner"] },
  { name: "Sushi Roll (6 pieces)", ar: "سوشي رول (6 قطع)", protein: 9, carbs: 40, fat: 5, calories: 250, mealTypes: ["lunch", "dinner"] },
  { name: "Chicken Nuggets (6 pieces)", ar: "قطع دجاج (6 قطع)", protein: 14, carbs: 16, fat: 18, calories: 280, mealTypes: ["lunch", "dinner", "snack"] },
  { name: "Fried Fish Fillet (100g)", ar: "فيليه سمك مقلي (100غ)", protein: 15, carbs: 12, fat: 14, calories: 230, mealTypes: ["lunch", "dinner"] },

  // ── More breads (Levantine / Jordanian + common) ───────────────────────────
  { name: "Saj / Markook Bread (1 piece)", ar: "خبز صاج / مرقوق (رغيف)", protein: 6, carbs: 38, fat: 1, calories: 190, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Taboon Bread (1 loaf)", ar: "خبز طابون (رغيف)", protein: 7, carbs: 44, fat: 2, calories: 230, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Shrak Bread (1 piece)", ar: "خبز شراك (رغيف)", protein: 5, carbs: 32, fat: 1, calories: 160, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Kaak (Sesame Bread) (1)", ar: "كعك بالسمسم (قدس) (واحد)", protein: 8, carbs: 50, fat: 6, calories: 300, mealTypes: ["breakfast", "snack"] },
  { name: "Brown Bread (1 slice)", ar: "خبز أسمر (شريحة)", protein: 3.5, carbs: 13, fat: 1.2, calories: 78, mealTypes: ["breakfast", "snack"] },
  { name: "Multigrain Bread (1 slice)", ar: "خبز متعدد الحبوب (شريحة)", protein: 4, carbs: 12, fat: 1.5, calories: 90, mealTypes: ["breakfast", "snack"] },
  { name: "Rye Bread (1 slice)", ar: "خبز الجاودار (شريحة)", protein: 2.7, carbs: 15, fat: 1, calories: 83, mealTypes: ["breakfast", "snack"] },
  { name: "Sourdough Bread (1 slice)", ar: "خبز العجين المخمّر (شريحة)", protein: 4, carbs: 18, fat: 0.6, calories: 93, mealTypes: ["breakfast", "snack"] },
  { name: "Toast (1 slice)", ar: "خبز محمّص توست (شريحة)", protein: 3, carbs: 13, fat: 1.5, calories: 88, mealTypes: ["breakfast", "snack"] },
  { name: "Baguette (1 piece)", ar: "خبز باغيت (قطعة)", protein: 7, carbs: 40, fat: 1.5, calories: 210, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Burger Bun (1)", ar: "خبز برغر (واحد)", protein: 5, carbs: 26, fat: 3, calories: 150, mealTypes: ["lunch", "dinner"] },
  { name: "Naan Bread (1)", ar: "خبز نان (واحد)", protein: 9, carbs: 50, fat: 6, calories: 290, mealTypes: ["lunch", "dinner"] },
  { name: "Lavash (1)", ar: "خبز لافاش (واحد)", protein: 3, carbs: 16, fat: 0.5, calories: 80, mealTypes: ["breakfast", "lunch", "dinner"] },
  { name: "Kommaj / Small Pita (1)", ar: "خبز كماج / صغير (واحد)", protein: 4, carbs: 24, fat: 1, calories: 130, mealTypes: ["breakfast", "lunch", "dinner"] },

  // ── Athlete staples: protein sources, pre/post-workout, supplements ──────────
  { name: "Egg Whites (100g)", ar: "بياض بيض (100غ)", protein: 11, carbs: 0.7, fat: 0.2, calories: 52, mealTypes: ["breakfast", "post_workout"] },
  { name: "Whole Egg (1 large)", ar: "بيضة كاملة (كبيرة)", protein: 6, carbs: 0.6, fat: 5, calories: 72, mealTypes: ["breakfast"] },
  { name: "Canned Tuna in Water (100g)", ar: "تونة معلبة بالماء (100غ)", protein: 26, carbs: 0, fat: 1, calories: 116, mealTypes: ["lunch", "dinner", "post_workout"] },
  { name: "Cottage Cheese (100g)", ar: "جبنة قريش (100غ)", protein: 11, carbs: 3.4, fat: 4.3, calories: 98, mealTypes: ["breakfast", "snack"] },
  { name: "Skyr / High-Protein Yogurt (170g)", ar: "زبادي عالي البروتين سكير (170غ)", protein: 17, carbs: 6, fat: 0, calories: 100, mealTypes: ["breakfast", "snack", "post_workout"] },
  { name: "Whey Protein Scoop (30g)", ar: "مكيال واي بروتين (30غ)", protein: 24, carbs: 3, fat: 1.5, calories: 120, mealTypes: ["post_workout", "snack"] },
  { name: "Casein Protein Scoop (32g)", ar: "مكيال كازين بروتين (32غ)", protein: 24, carbs: 3, fat: 1, calories: 120, mealTypes: ["snack"] },
  { name: "Mass Gainer Scoop (150g)", ar: "مكيال زيادة وزن (150غ)", protein: 30, carbs: 100, fat: 5, calories: 600, mealTypes: ["post_workout", "snack"] },
  { name: "Protein Bar (60g)", ar: "لوح بروتين (60غ)", protein: 20, carbs: 22, fat: 7, calories: 220, mealTypes: ["snack", "pre_workout", "post_workout"] },
  { name: "Rice Cake (1)", ar: "كعكة أرز (واحدة)", protein: 0.7, carbs: 7.3, fat: 0.3, calories: 35, mealTypes: ["snack", "pre_workout"] },
  { name: "Peanut Butter (1 tbsp)", ar: "زبدة فول سوداني (ملعقة كبيرة)", protein: 4, carbs: 3, fat: 8, calories: 94, mealTypes: ["breakfast", "snack"] },
  { name: "Rolled Oats (40g)", ar: "شوفان (40غ)", protein: 5, carbs: 27, fat: 3, calories: 150, mealTypes: ["breakfast", "pre_workout"] },
  { name: "Granola (50g)", ar: "غرانولا (50غ)", protein: 5, carbs: 32, fat: 8, calories: 220, mealTypes: ["breakfast", "snack"] },
  { name: "Sweet Potato (100g)", ar: "بطاطا حلوة (100غ)", protein: 1.6, carbs: 20, fat: 0.1, calories: 86, mealTypes: ["lunch", "dinner", "pre_workout"] },
  { name: "Salmon Fillet (100g)", ar: "شريحة سلمون (100غ)", protein: 20, carbs: 0, fat: 13, calories: 208, mealTypes: ["lunch", "dinner"] },
  { name: "Shrimp (100g)", ar: "روبيان (100غ)", protein: 24, carbs: 0.2, fat: 0.3, calories: 99, mealTypes: ["lunch", "dinner"] },
  { name: "Edamame (100g)", ar: "إيدامامي (100غ)", protein: 11, carbs: 10, fat: 5, calories: 121, mealTypes: ["snack", "lunch"] },
  { name: "Banana (1 medium)", ar: "موزة (متوسطة)", protein: 1.3, carbs: 27, fat: 0.4, calories: 105, mealTypes: ["snack", "pre_workout"] },
  { name: "Dates (2 pieces)", ar: "تمر (حبتان)", protein: 0.4, carbs: 18, fat: 0, calories: 66, mealTypes: ["snack", "pre_workout"] },
  { name: "Creatine Monohydrate (5g)", ar: "كرياتين مونوهيدرات (5غ)", protein: 0, carbs: 0, fat: 0, calories: 0, mealTypes: ["pre_workout", "post_workout"] },
  { name: "BCAA Serving (10g)", ar: "حصة أحماض أمينية BCAA (10غ)", protein: 0, carbs: 0, fat: 0, calories: 40, mealTypes: ["pre_workout"] },
  { name: "Electrolyte Drink (500ml)", ar: "مشروب إلكتروليت (500مل)", protein: 0, carbs: 14, fat: 0, calories: 55, mealTypes: ["drink", "pre_workout"] },
  { name: "Black Coffee (1 cup)", ar: "قهوة سادة (كوب)", protein: 0.3, carbs: 0, fat: 0, calories: 2, mealTypes: ["drink", "pre_workout"] },
  { name: "Chicken & Rice Bowl (400g)", ar: "طبق دجاج وأرز (400غ)", protein: 40, carbs: 60, fat: 10, calories: 520, mealTypes: ["lunch", "dinner", "post_workout"] },
];

export async function seedNutrition() {
  let inserted = 0, updated = 0;
  for (const f of FOODS) {
    let [row] = await db.select().from(foods).where(and(isNull(foods.userId), eq(foods.name, f.name)));
    if (!row) {
      [row] = await db.insert(foods)
        .values({ name: f.name, protein: f.protein, carbs: f.carbs, fat: f.fat, calories: f.calories, mealTypes: f.mealTypes })
        .returning();
      inserted++;
    } else {
      // keep macros/hints in sync with the seed (single source of truth)
      await db.update(foods)
        .set({ protein: f.protein, carbs: f.carbs, fat: f.fat, calories: f.calories, mealTypes: f.mealTypes })
        .where(eq(foods.id, row.id));
      updated++;
    }
    await db.insert(foodTranslations).values({ foodId: row.id, locale: "ar", name: f.ar })
      .onConflictDoUpdate({ target: [foodTranslations.foodId, foodTranslations.locale], set: { name: f.ar } });
  }
  console.log(`✓ nutrition seed: ${inserted} new, ${updated} updated (${FOODS.length} foods) + ar translations`);
}

if (process.argv[1]?.includes("nutrition.seed")) {
  seedNutrition().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
