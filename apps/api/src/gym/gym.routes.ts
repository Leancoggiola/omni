import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
import type { NextFunction, Request, Response } from 'express';
import {
  addGymExerciseSchema,
  createGymPlanSchema,
  listGymPlansSchema,
  updateGymExerciseSchema,
  updateGymExerciseWeightSchema,
  type ListGymPlansParams,
} from '@omni/shared/gym';
import { authenticateJwt } from '../auth/middleware/auth.middleware';
import { validate } from '../common/utils';
import * as gymService from './gym.service';

const router = Router();

router.use(authenticateJwt);

router.get('/plans', validate(listGymPlansSchema, 'query'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await gymService.listPlans(userId, req.query as unknown as ListGymPlansParams);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/plans/:planId',
  validate(idParamsSchema('planId'), 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      const result = await gymService.getPlan(userId, req.params.planId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/plans', validate(createGymPlanSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await gymService.createPlan(userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/plans/:planId/archive',
  validate(idParamsSchema('planId'), 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      const result = await gymService.archivePlan(userId, req.params.planId as string);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/exercises', validate(addGymExerciseSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user as { userId: string };
    const result = await gymService.addExercise(userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/exercises/:exerciseId',
  validate(idParamsSchema('exerciseId'), 'params'),
  validate(updateGymExerciseSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      const result = await gymService.updateExercise(userId, req.params.exerciseId as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/exercises/:exerciseId/weight',
  validate(idParamsSchema('exerciseId'), 'params'),
  validate(updateGymExerciseWeightSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      const result = await gymService.updateExerciseWeight(userId, req.params.exerciseId as string, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/exercises/:exerciseId',
  validate(idParamsSchema('exerciseId'), 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.user as { userId: string };
      await gymService.deleteExercise(userId, req.params.exerciseId as string);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
