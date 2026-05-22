import { z } from "zod";

export const nicknameSchema = z.string().trim().min(2).max(24);
export const postTextSchema = z.string().trim().min(1).max(800);
export const commentTextSchema = z.string().trim().min(1).max(300);
export const imageUrlsSchema = z.array(z.string().url()).max(4);
export const campusSourceCodeSchema = z.string().trim().min(1).max(80);
export const campusIdSchema = z.string().trim().min(1).max(80);
export const spotIdSchema = z.string().trim().min(1).max(80);
