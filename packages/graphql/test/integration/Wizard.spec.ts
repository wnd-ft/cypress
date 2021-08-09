import type { NxsMutationArgs } from 'nexus-decorators'
import snapshot from 'snap-shot-it'
import { expect } from 'chai'
import axios from 'axios'
import { BaseActions, BaseContext, Project, User, Wizard } from '../../src'
import { startGraphQLServer, closeGraphQLServer, setServerContext } from '../../src/server'

class TestActions extends BaseActions {
  async authenticate () {
    this.ctx.user = new User({
      authToken: 'test-auth-token',
      email: 'test@cypress.io',
      name: 'cypress test',
    })
  }

  async getRuns ({ projectId }: { projectId: string }) {
  }

  installDependencies () {}

  createConfigFile () {}

  createProjectBase (input: NxsMutationArgs<'addProject'>['input']) {
    return new Project({
      isCurrent: true,
      projectRoot: '/foo/bar',
      projectBase: {
        isOpen: true,
        initializePlugins: () => Promise.resolve(),
      },
    })
  }
}

interface TestContextInjectionOptions {
  wizard?: Wizard
}

class TestContext extends BaseContext {
  projects: Project[] = []
  readonly actions: BaseActions
  user: undefined

  constructor ({ wizard }: TestContextInjectionOptions = {}) {
    super()
    this.actions = new TestActions(this)
    if (wizard) {
      this.wizard = wizard
    }
  }
}

/**
 * Creates a new GraphQL server to query during integration tests.
 * Also performsn any clean up from previous tests.
 * Optionally you may provide a context to orchestrate testing
 * specific scenarios or states.
 */
const initGraphql = async (ctx: BaseContext) => {
  await closeGraphQLServer()
  if (ctx) {
    setServerContext(ctx)
  }

  return startGraphQLServer({ port: 51515 })
}

const makeRequest = async (endpoint: string, query: string) => {
  const res = await axios.post(endpoint,
    JSON.stringify({
      query,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    })

  return res.data.data
}

describe('Wizard', () => {
  describe('sampleCode', () => {
    it('returns null when bundler is set but framework is null', async () => {
      const wizard = new Wizard()

      wizard.setBundler('webpack')

      const context = new TestContext({ wizard })
      const { endpoint } = await initGraphql(context)

      const result = await makeRequest(endpoint, `
        {
          wizard {
            sampleCode(lang: ts)
          }
        }
      `)

      expect(result.wizard.sampleCode).to.be.null
    })

    it('returns null when framework is set but bundler is null', async () => {
      const wizard = new Wizard()

      wizard.setFramework('react')

      const context = new TestContext({ wizard })
      const { endpoint } = await initGraphql(context)

      const result = await makeRequest(endpoint, `
        {
          wizard {
            sampleCode(lang: ts)
          }
        }
      `)

      expect(result.wizard.sampleCode).to.be.null
    })

    it('returns sampleCode when framework and bundler is set', async () => {
      const wizard = new Wizard()

      wizard.setFramework('cra')
      wizard.setBundler('webpack')

      const context = new TestContext({ wizard })
      const { endpoint } = await initGraphql(context)

      const result = await makeRequest(endpoint, `
        {
          wizard {
            sampleCode(lang: ts)
          }
        }
      `)

      snapshot(result)
    })
  })
})

describe('App', () => {
  describe('authenticate', () => {
    it('assigns a new user', async () => {
      const context = new TestContext()
      const { endpoint } = await initGraphql(context)

      const result = await makeRequest(endpoint, `
        mutation Authenticate {
          authenticate {
            user {
              email
              name
              authToken
            }
          }
        }
      `)

      expect(result).to.eql({
        authenticate: {
          user: {
            email: 'test@cypress.io',
            name: 'cypress test',
            authToken: 'test-auth-token',
          },
        },
      })
    })
  })
})