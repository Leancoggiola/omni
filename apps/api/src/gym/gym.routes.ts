import { Router } from 'express';
import { idParamsSchema } from '@omni/shared/common';
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
import { validatedQuery } from '../common/http';

const router = Router();

router.use(authenticateJwt);

router.get('/plans', validate(listGymPlansSchema, 'query'), async (req, res) => {
  const { userId } = req.user!;
  const result = await gymService.listPlans(userId, validatedQuery<ListGymPlansParams>(req));
  res.json(result);
});

router.get('/plans/:planId', validate(idParamsSchema('planId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  const result = await gymService.getPlan(userId, req.params.planId as string);
  res.json(result);
});

router.post('/plans', validate(createGymPlanSchema), async (req, res) => {
  const { userId } = req.user!;
  const result = await gymService.createPlan(userId, req.body);
  res.status(201).json(result);
});

router.post('/plans/:planId/archive', validate(idParamsSchema('planId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  const result = await gymService.archivePlan(userId, req.params.planId as string);
  res.json(result);
});

router.post('/exercises', validate(addGymExerciseSchema), async (req, res) => {
  const { userId } = req.user!;
  const result = await gymService.addExercise(userId, req.body);
  res.status(201).json(result);
});

router.patch(
  '/exercises/:exerciseId',
  validate(idParamsSchema('exerciseId'), 'params'),
  validate(updateGymExerciseSchema),
  async (req, res) => {
    const { userId } = req.user!;
    const result = await gymService.updateExercise(userId, req.params.exerciseId as string, req.body);
    res.json(result);
  }
);

router.patch(
  '/exercises/:exerciseId/weight',
  validate(idParamsSchema('exerciseId'), 'params'),
  validate(updateGymExerciseWeightSchema),
  async (req, res) => {
    const { userId } = req.user!;
    const result = await gymService.updateExerciseWeight(userId, req.params.exerciseId as string, req.body);
    res.json(result);
  }
);

router.delete('/exercises/:exerciseId', validate(idParamsSchema('exerciseId'), 'params'), async (req, res) => {
  const { userId } = req.user!;
  await gymService.deleteExercise(userId, req.params.exerciseId as string);
  res.status(204).send();
});

export default router;
