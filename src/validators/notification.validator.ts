import Joi from "joi";

export const notificationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isRead: Joi.boolean().optional(),
});

export const notificationIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
