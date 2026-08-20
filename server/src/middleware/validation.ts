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
        const issues = error.issues.map((err) => {
          let message = err.message
          if (message.includes('received undefined')) {
            message = 'required'
          }
          return {
            field: err.path.slice(1).join('.'),
            message
          }
        })
        const firstMessage = issues[0]?.message || 'Validation failed'
        res.status(400).json({
          error: firstMessage,
          details: issues
        })
        return
      }
      res.status(500).json({ error: 'Internal validation error' })
    }
  }
}
