import { useStrict } from 'mobx'
import React from 'react'
import { render } from 'react-dom'

import state from './lib/state'
import App from './app/app'

useStrict(true)

window.Runner = {
  start (el, config) {
    render(<App config={config} state={state} />, el)
  },
}
