import { z } from "zod";

// meal-type hints a food fits into (a food can belong to many)
export const MEAL_TYPE_TAGS = [
  "breakfast", "lunch", "dinner", "snack", "drink", "dessert", "pre_workout", "post_workout",
] as const;

export const FoodSchema = z.object({
  id: z.string(), name: z.string(),
  protein: z.number(), carbs: z.number(), fat: z.number(), calories: z.number(),
  mealTypes: z.array(z.enum(MEAL_TYPE_TAGS)).default([]),
}).openapi("Food");

const MealItemSchema = z.object({
  id: z.string(),
  foodId: z.string().optional(),
  name: z.string(),
  protein: z.number(), carbs: z.number(), fat: z.number(), calories: z.number(),
  quantity: z.number().default(1),
});
const MealSchema = z.object({ type: z.string(), items: z.array(MealItemSchema) });

export const AddItemSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snacks"]),
  item: z.object({
    foodId: z.string().optional(),
    name: z.string().min(1),
    protein: z.number().default(0), carbs: z.number().default(0), fat: z.number().default(0), calories: z.number().default(0),
    quantity: z.number().min(0.1).default(1),
  }),
}).openapi("AddMealItem");

export const TargetsSchema = z.object({
  protein: z.number().int().min(0), carbs: z.number().int().min(0), fat: z.number().int().min(0), calories: z.number().int().min(0),
}).openapi("NutritionTargets");

export const InBodyInputSchema = z.object({
  date: z.string(),
  weight: z.number().optional(), muscleMass: z.number().optional(), bodyFat: z.number().optional(),
  bodyWater: z.number().optional(), bmi: z.number().optional(), bmr: z.number().optional(),
  visceralFat: z.number().optional(), skeletalMuscle: z.number().optional(),
}).openapi("InBodyInput");

// admin
export const AdminFoodInputSchema = z.object({
  name: z.string().min(1),
  protein: z.number().default(0), carbs: z.number().default(0), fat: z.number().default(0), calories: z.number().default(0),
  mealTypes: z.array(z.enum(MEAL_TYPE_TAGS)).default([]),
  translations: z.record(z.string(), z.object({ name: z.string().optional() })).optional(),
}).openapi("AdminFoodInput");

export type AddItem = z.infer<typeof AddItemSchema>;
export type Targets = z.infer<typeof TargetsSchema>;
export type InBodyInput = z.infer<typeof InBodyInputSchema>;
export type AdminFoodInput = z.infer<typeof AdminFoodInputSchema>;
export { MealSchema };
