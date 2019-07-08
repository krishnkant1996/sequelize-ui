import React from 'react'

import Storage from '../utils/Storage.js'
import * as stateUtils from '../utils/state.js'

import Header from './components/Header.jsx'
import Button from './components/Button.jsx'
import Message from './components/Message.jsx'
import Home from './views/Home.jsx'
import Project from './views/Project.jsx'
import Model from './views/Model.jsx'

const HOME = 'HOME'
const LOADING = 'LOADING'
const PROJECT = 'PROJECT'
const MODEL = 'MODEL'
const MESSAGE_TIME = 1750
const STATE_KEY = 'SUI_STATE'
const FLAGS_KEY = 'SUI_FLAGS'

export default class App extends React.Component {
  state = {
    loaded: false,
    pageState: LOADING,
    nextModelId: 1,
    nextFieldId: 1,
    config: {
      timestamps: true,
      snake: false,
      singularTableNames: false,
      dialect: 'sqlite',
      name: 'my-project'
    },
    models: [],
    currentModelId: null,
    messages: []
  }

  constructor (props) {
    super(props)
    this.createRefs()

    this.flags = new Storage(FLAGS_KEY)
    this.store = new Storage(STATE_KEY)
    this.mergePersistedState()
    console.log('constructor!!!', this.state)
  }

  createRefs = () => {
    this.projectComponent = React.createRef()
  }

  async mergePersistedState () {
    const persistedData = await this.store.load()
    const hasLeftHome = await this.flags.get('hasLeftHome')
    const pageState = this.getLandingPage(persistedData, hasLeftHome)
    persistedData.pageState = pageState
    persistedData.loaded = true
    this.setState(persistedData)
  }

  getLandingPage = (data, hasLeftHome) => {
    if (data.pageState && data.pageState !== LOADING) {
      return data.pageState
    }

    if (hasLeftHome) {
      return PROJECT
    }

    return HOME
  }

  // Persistence
  componentDidUpdate (prevProps, prevState) {
    if (this.state.loaded) {
      const keysToPersist = [
        'pageState',
        'nextModelId',
        'nextFieldId',
        'config',
        'models',
        'currentModelId'
      ]

      const stateToPersist = stateUtils.extract(this.state, keysToPersist)
      this.store.save(stateToPersist)
    }

    if (prevState.page !== this.state.page) {
      this.clearPageState(prevState.page)
    }
  }

  // loadState = () => (localStorage['SUI'] ? JSON.parse(localStorage['SUI']) : {})

  // persistState = keys => {
  //   const stateToPersist = Object.entries(this.state)
  //     .filter(([key, value]) => keys.includes(key))
  //     .reduce((acc, [key, value]) => Object.assign(acc, { [key]: value }), {})

  //   localStorage.setItem('SUI', JSON.stringify(stateToPersist))
  // }

  reset = () => {
    this.flags.reset()
    this.store.reset()
    // localStorage.removeItem('SUI')
    location.reload()
  }

  // saveHasLeftHome = () => localStorage.setItem('SUI-home-visited', true)
  // getHasLeftHome = () => localStorage.get.item('SUI-home-visited')

  clearPageState = page => {
    switch (page) {
      case HOME:
        this.flags.put('hasLeftHome', true)
        break
      case PROJECT:
        break
      case MODEL:
        this.setState({ currentModelId: true })
        break
      default:
        break
    }
  }

  // Navigation
  goHome = () => this.setState({ pageState: HOME })

  goToProject = () =>
    this.setState({ pageState: PROJECT, currentModelId: null })

  goToModel = id => this.setState({ pageState: MODEL, currentModelId: id })

  // Messages
  newMessage = (text, type) => {
    const id = Math.random()
    const message = { id, text, type }

    clearTimeout(this.messageTimeout)
    this.messageTimeout = setTimeout(() => this.clearMessage(id), MESSAGE_TIME)
    this.setState({ messages: [message, ...this.state.messages] })
  }

  clearMessage = id =>
    this.setState({ messages: this.state.messages.filter(m => m.id !== id) })

  // Project Methods
  toggleTimestamps = () =>
    this.setState(({ config }) => ({
      config: { ...config, timestamps: !config.timestamps }
    }))

  toggleSnake = () =>
    this.setState(({ config }) => ({
      config: { ...config, snake: !config.snake }
    }))

  toggleSingularTableNames = () =>
    this.setState(({ config }) => ({
      config: { ...config, singularTableNames: !config.singularTableNames }
    }))

  createModel = ({ model }) => {
    this.setState({
      models: [...this.state.models, buildModel(this.state.nextModelId, model)],
      nextModelId: this.state.nextModelId + 1
    })
  }

  deleteModel = id =>
    this.setState({
      models: this.state.models.filter(model => model.id !== id)
    })

  // Model Methods
  updateModelName = ({ name }) =>
    this.setState(({ models, currentModelId }) => ({
      models: models.map(model =>
        model.id === currentModelId ? updateModelName(model, name) : model
      )
    }))

  createField = ({ field }) =>
    this.setState(({ models, currentModelId, nextFieldId }) => ({
      models: models.map(model =>
        model.id === currentModelId
          ? addField(model, nextFieldId, field)
          : model
      ),
      nextFieldId: nextFieldId + 1
    }))

  updateField = ({ field }) =>
    this.setState(({ models, currentModelId }) => ({
      models: models.map(model =>
        model.id === currentModelId ? updateField(model, field) : model
      )
    }))

  deleteField = fieldId =>
    this.setState(({ models, currentModelId }) => ({
      models: models.map(model =>
        model.id === currentModelId ? removeField(model, fieldId) : model
      )
    }))

  // View Methods

  renderPage = () => {
    switch (this.state.pageState) {
      case LOADING:
        return <p>Loading...</p>
      case HOME:
        return <Home />
      case PROJECT:
        return (
          <Project
            ref={this.projectComponent}
            config={this.state.config}
            models={this.state.models}
            toggleTimestamps={this.toggleTimestamps}
            toggleSnake={this.toggleSnake}
            toggleSingularTableNames={this.toggleSingularTableNames}
            createModel={this.createModel}
            goToModel={this.goToModel}
            deleteModel={this.deleteModel}
            newMessage={this.newMessage}
          />
        )
      case MODEL:
        const model = this.state.models.find(
          ({ id }) => id === this.state.currentModelId
        )
        return (
          <Model
            model={model}
            models={this.state.models}
            config={this.state.config}
            goToProject={this.goToProject}
            updateModelName={this.updateModelName}
            createField={this.createField}
            updateField={this.updateField}
            deleteField={this.deleteField}
            newMessage={this.newMessage}
          />
        )
      default:
        return <p>Sorry, something went wrong.</p>
    }
  }

  topBarActions () {
    const githubLink = {
      href: 'https://github.com/tomjschuster/sequelize-ui',
      icon: 'github',
      iconPosition: 'above',
      label: 'GitHub'
    }

    return [githubLink]
  }

  render () {
    return (
      <React.Fragment>
        <Header
          actions={this.topBarActions()}
          onTitleClick={this.goToProject}
        />
        {this.renderPage()}
        <footer className='footer'>
          <Button
            className='footer__reset'
            label='Reset'
            onClick={this.reset}
          />
        </footer>
        <Message time={MESSAGE_TIME} messages={this.state.messages} />
      </React.Fragment>
    )
  }
}

const buildModel = (id, model) => ({ id, ...model, fields: [] })
const buildField = (id, field) => ({ id, ...field })

const updateModelName = (model, name) => ({ ...model, name })

const addField = (model, nextFieldId, field) => ({
  ...model,
  fields: [...model.fields, buildField(nextFieldId, field)]
})

const updateField = (model, field) => ({
  ...model,
  fields: model.fields.map(f => (f.id === field.id ? field : f))
})

const removeField = (model, fieldId) => ({
  ...model,
  fields: model.fields.filter(field => field.id !== fieldId)
})
