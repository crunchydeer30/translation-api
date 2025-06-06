import { z } from 'zod';
import { TRANSLATION_TASK_HTTP_ROUTES } from '../controllers/translation-task.http.routes';
import { TranslationTaskPickResponseSchema } from '../models';

export namespace PickEvaluationTaskCommand {
  export const ENDPOINT = TRANSLATION_TASK_HTTP_ROUTES.PICK_EVALUATION;
  export const METHOD = 'POST';

  export const RequestSchema = z.object({
    languagePairId: z.string().uuid(),
  });
  export type Request = z.infer<typeof RequestSchema>;

  export const ResponseSchema = TranslationTaskPickResponseSchema;

  export type Response = z.infer<typeof ResponseSchema>;
}
