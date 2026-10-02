import { Router, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { authGuard } from '../middleware/authGuard.js';
import { signupSchema, loginSchema } from '../validators/authValidators.js';

const router = Router();

const validate = (schema: any) => (req: any, res: Response, next: any) => {
  const result = schema.safeParse({ body: req.body });
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten().fieldErrors });
  }
  next();
};

router.post('/signup', validate(signupSchema), async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.status(201).json({ user: data.user, session: data.session });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.json({ access_token: data.session?.access_token, user: data.user });
});

router.post('/logout', authGuard, async (req, res) => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  
  return res.status(204).send();
});

export default router;