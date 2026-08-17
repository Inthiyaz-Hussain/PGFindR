import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

export const validateRequest = (schema: z.ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.issues.map((err) => ({
            field: err.path.slice(1).join('.'),
            message: err.message
          }))
        })
        return
      }
      res.status(500).json({ error: 'Internal validation error' })
    }
  }
}
