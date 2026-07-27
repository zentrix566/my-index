import express from 'express'
import { requireOwner } from '../auth.js'
import {
  getStats,
  getTopPages,
  getGeoDistribution,
  getRecentVisits,
  getHourlyTrend
} from '../logger.js'

const router = express.Router()

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      await handler(req, res)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  }
}

router.use(requireOwner)

router.get('/overview', asyncRoute(async (_req, res) => {
  res.json(await getStats())
}))

router.get('/pages', asyncRoute(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 30)
  res.json(await getTopPages(days))
}))

router.get('/geo', asyncRoute(async (req, res) => {
  const days = Math.min(parseInt(req.query.days, 10) || 7, 30)
  res.json(await getGeoDistribution(days))
}))

router.get('/recent', asyncRoute(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200)
  res.json(await getRecentVisits(limit))
}))

router.get('/hourly', asyncRoute(async (_req, res) => {
  res.json(await getHourlyTrend())
}))

export default router
