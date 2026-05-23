import { z } from "zod";

export const nicknameSchema = z.string().trim().min(2).max(24);
export const postTextSchema = z.string().trim().max(160);
export const statusTagSchema = z.enum(["人少", "一般", "爆满", "有空位"]);
export const feedbackTypeSchema = z.enum(["confirmed", "outdated"]);
export const commentTextSchema = z.string().trim().min(1).max(300);
export const imageUrlsSchema = z.array(z.string().url()).max(4);
export const campusSourceCodeSchema = z.string().trim().min(1).max(80);
export const campusIdSchema = z.string().trim().min(1).max(80);
export const spotIdSchema = z.string().trim().min(1).max(80);
