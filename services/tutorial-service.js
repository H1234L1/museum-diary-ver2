const storage = require('./storage-adapter')
const { TUTORIAL_STEPS } = require('../config/tutorial-steps')

const TUTORIAL_STORAGE_KEY = 'museum:tutorial:v1'
const TUTORIAL_VERSION = 1

const createState = (status = 'idle', stepIndex = 0) => ({
  version: TUTORIAL_VERSION,
  status,
  stepIndex,
  updatedAt: new Date().toISOString()
})

const getTutorialState = async () => {
  const state = await storage.get(TUTORIAL_STORAGE_KEY)
  if (!state || state.version !== TUTORIAL_VERSION) return createState()

  return {
    ...state,
    stepIndex: Math.min(Math.max(Number(state.stepIndex) || 0, 0), TUTORIAL_STEPS.length - 1)
  }
}

const saveTutorialState = async (state) => {
  const nextState = {
    ...state,
    version: TUTORIAL_VERSION,
    updatedAt: new Date().toISOString()
  }
  await storage.set(TUTORIAL_STORAGE_KEY, nextState)
  return nextState
}

const startTutorial = async () => saveTutorialState(createState('active', 0))

const advanceTutorial = async () => {
  const state = await getTutorialState()
  const nextIndex = Math.min(state.stepIndex + 1, TUTORIAL_STEPS.length - 1)
  return saveTutorialState({ ...state, status: 'active', stepIndex: nextIndex })
}

const skipTutorial = async () => {
  const state = await getTutorialState()
  return saveTutorialState({ ...state, status: 'skipped' })
}

const completeTutorial = async () => {
  const state = await getTutorialState()
  return saveTutorialState({ ...state, status: 'completed', stepIndex: TUTORIAL_STEPS.length - 1 })
}

const resetTutorial = async () => startTutorial()

module.exports = {
  TUTORIAL_STORAGE_KEY,
  TUTORIAL_VERSION,
  getTutorialState,
  startTutorial,
  advanceTutorial,
  skipTutorial,
  completeTutorial,
  resetTutorial
}
