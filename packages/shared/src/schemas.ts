/**
 * Schémas Zod partagés (DTO front ↔ back).
 * Le serveur valide chaque entrée avec ces schémas ; le client les réutilise
 * pour la validation de formulaire et l'inférence de types.
 */
import { z } from 'zod';
import { BuildingType, ResearchType } from './enums';

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Au moins 3 caractères')
  .max(20, 'Au plus 20 caractères')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Lettres, chiffres, tiret et underscore uniquement');

export const passwordSchema = z
  .string()
  .min(10, 'Au moins 10 caractères')
  .max(128, 'Au plus 128 caractères');

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const buildBuildingSchema = z.object({
  planetId: z.string().uuid(),
  type: z.nativeEnum(BuildingType),
});
export type BuildBuildingDto = z.infer<typeof buildBuildingSchema>;

export const startResearchSchema = z.object({
  planetId: z.string().uuid(),
  type: z.nativeEnum(ResearchType),
});
export type StartResearchDto = z.infer<typeof startResearchSchema>;

export const coordinatesSchema = z.object({
  galaxy: z.number().int().min(1),
  system: z.number().int().min(1),
  position: z.number().int().min(1),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const colonizeSchema = z.object({
  sourcePlanetId: z.string().uuid(),
  target: coordinatesSchema,
});
export type ColonizeDto = z.infer<typeof colonizeSchema>;
