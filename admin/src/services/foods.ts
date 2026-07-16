import axios from "../lib/axios";

export type Translations = Record<string, { name?: string }>;

export const MEAL_TYPES = [
  "breakfast", "lunch", "dinner", "snack", "drink", "dessert", "pre_workout", "post_workout",
] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
  drink: "Drink", dessert: "Dessert", pre_workout: "Pre-Workout", post_workout: "Post-Workout",
};

export interface Food {
  id: string;
  name: string;
  protein: number; carbs: number; fat: number; calories: number;
  mealTypes: MealType[];
  translations?: Translations;
}
export interface FoodInput {
  name: string;
  protein: number; carbs: number; fat: number; calories: number;
  mealTypes: MealType[];
  translations?: Translations;
}

export const FOODS_KEY = "foods";

export const listFoods = (search?: string) =>
  axios.get<{ data: Food[] }>("/foods", { params: { search } }).then((r) => r.data.data);
export const createFood = (data: FoodInput) => axios.post<Food>("/foods", data).then((r) => r.data);
export const updateFood = (id: string, data: Partial<FoodInput>) => axios.patch<Food>(`/foods/${id}`, data).then((r) => r.data);
export const deleteFood = (id: string) => axios.delete(`/foods/${id}`);
