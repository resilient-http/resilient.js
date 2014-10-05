# resilient.js [![Build Status](https://api.travis-ci.org/resilient-http/resilient.js.svg?branch=master)][travis] [![Stories in Ready](https://badge.waffle.io/resilient-http/resilient.js.png?label=ready&title=Ready)](https://waffle.io/resilient-http/resilient.js) [![Code Climate](https://codeclimate.com/github/resilient-http/resilient.js/badges/gpa.svg)](https://codeclimate.com/github/resilient-http/resilient.js) [![Gitter chat](https://badges.gitter.im/resilient-http/resilient.js.png)](https://gitter.im/resilient-http/resilient.js)

<img align="right" height="280" src="https://raw.githubusercontent.com/resilient-http/resilient.js/gh-pages/images/resilient.png" />

A browser and node.js fault tolerant, balanced, configurable and full featured HTTP client for distributed and reactive systems

For more information about the **resilient**, see the [project site](http://resilient-http.github.io)

## Features

- Fault tolerant, transparent fallback
- Client side smart balancer based on server latency and errors
- Built-in support for servers caching for more reilability
- Servers discovering based on the resilient high-level protocol
- Parallel discovering built-in support for a faster service discovery
- Highly configurable (timeout, retry times, cache, implicit delay...)
- Cross-engine (browsers and node.js)

<!--
## Introduction

Organisations working in disparate domains are independently discovering patterns
for building software that look the same.
These systems are more robust, more resilient, more flexible and better positioned to meet modern demands.

The system stays responsive in the face of failure.
This applies not only to highly-available, mission critical systems — any system that is not resilient will be unresponsive after a failure

### What resilient means?

Acording to the [reactive manifiesto](http://reactivemanifiesto.org), a good description for could be:

Resilience is achieved by replication, containment, isolation and delegation.
Failures are contained within each component, isolating components from each other
and thereby ensuring that parts of the system can fail and recover without
compromising the system as a whole. Recovery of each component is delegated to another (external)
component and high-availability is ensured by replication where necessary.
The client of a component is not burdened with handling its failures

### A client-side balancer?

Yes. `resilient` aims to delegate a part of the balance logic responsabilities on the client-side,

Web applications evolved notably in the latest years, achieving and delegating new responsabilities in the client side.
The Web (and therefore HTTP) is based on a client-server architecture

### How does it works?

An algorithm worth more than words

The following diagram represents from high level point of view the complete HTTP request flow and logic encapsulated in `resilient`

<img src="http://rawgit.com/resilient-http/resilient.js/master/algorithm.svg" />
-->

## Installation

Via [Bower](http://bower.io)
```bash
bower install resilient
```

Via [Component](http://component.io/)
```bash
component install resilient-http/resilient.js
```

Or loading the script remotely
```html
<script src="//cdn.rawgit.com/resilient-http/resilient.js/0.1.0-beta.0/resilient.js"></script>
```

## Environments

Runs in any [ES5 compliant](http://kangax.github.io/compat-table/es5/) engine

- Node.js >= 0.6
- Chrome >= 5
- Firefox >= 3
- Safari >= 5
- Opera >= 10
- IE >= 9

## Basic usage

If `require` is available, you must use it to fetch the module.
Otherwise it will be available as global exposed as `resilient`

```js
var Resilient = require('resilient')
```

#### Static servers

Define your server pool
```js
var servers = [
  'http://api1.server.com',
  'http://api2.server.com',
  'http://api3.server.com'
]
```

Create a new client and set the servers
```js
var client = Resilient({ service: { basePath: '/api/1.0' }})
client.setServers(servers)
```

Perform the request (the best available server will be use)
```js
client.get('/users', function (err, res) {
  // ...
})
```

#### Dynamic servers discovering

Define your discovering servers pool
```js
var servers = [
  'http://discover1.server.com',
  'http://discover2.server.com',
  'http://discover3.server.com'
]
```

Create a new client and set the discovering servers
```js
var client = Resilient({ service: { basePath: '/api/1.0' }})
client.setDiscoveryServers(servers)
```

Perform the request (the best available server will be use)
```js
client.get('/users', function (err, res) {
  // ...
})
```

## API

### resilient([ options ])

Creates a new `resilient` client with a custom config

#### Options

The options `object` has three different blocks and levels of configuration

##### Service

There are specific config options for the servers of the client service.
Resilient is a resource-oriented HTTP client, which could be ideal for RESTful Web services


- **servers** `array` - A list of valid URIs of servers to reach for the given service. Default `null`
- **expires** `number` - Servers list expiration time to live in miliseconds. Default `60` seconds
- **cache** `boolean` - Enable/disable servers cache in case of global fallback. Default `false`

- **path** `string` - Server request path as part of the final URL
- **data** `mixed` - Payload data to send as body request
- **headers** `object` - Map of strings representing HTTP headers to send to the server
- **timeout** `number` - Request maximum timeout in miliseconds before to abort it. Default to 30 seconds
- **auth** `object` - Authentication credentials to the server. Object must have the `user` and `password` properties
- **async** `boolean` - Set to `false` if the request must be performed as synchronous operation (not recommended, browser only)
- **withCredentials** `boolean` - Whether to set the withCredentials flag on the XHR object. See [MDN][withcredentials] for more information
- **method** `string` - Request HTTP method. Default to `GET`
- **responseType** `string` - Define how to handle the response data. Allowed values are: `text`, `arraybuffer`, `blob` or `document`
- **proxy** `string` - URI for the HTTP proxy to use (`node.js` only)

See aditional HTTP options for `node.js` [here](https://github.com/mikeal/request#requestoptions-callback)

##### Balancer

- **enable** `boolean` - Enable/disable the smart client balancer. Default `true`
- **weight** `object` - Balacer point percentage weight for server scoring policy. Default to 25 (response), 25 (latency) and 50 (errors)

<!--
- **middleware** `function` - Balancer map middleware result (to do)
- **policy** `string` - Balancer priority policy. Supported values are: `latency` or `errors`. Detault `errors`
-->

##### Discovery

Specific configuration for discovery servers requests, behavior and logic

- **servers** `array` - A list of valid URIs of endpoints to use as discovery servers. Default `null`
- **cache** `boolean` - Enable/disable discovery servers cache in case of global fallback. Default `true`
- **path** `string` - Server request path as part of the final URL
- **expires** `number` - Discovery servers list expiration time to live in miliseconds. Default `180` seconds
- **timeout** `number` - Server discovery network timeout in miliseconds. Default `2000`
- **cache** `boolean` - Enable/disable discovery servers cache in case of fallback. Default `true`
- **auth** `object` - Authentication credentials required for the discovery server. Object must have the `user` and `password` properties
- **headers** `object` - Map of strings representing HTTP headers to send to the discovery server
- **method** `string` - Request HTTP method. Default to `GET`
- **data** `mixed` - Optional data to send as payload to discovery servers. Default `null`

### resilient#get(options, callback)

### resilient#post(options, callback)

### resilient#put(options, callback)

### resilient#del(options, callback)

### resilient#patch(options, callback)

### resilient#head(options, callback)

### resilient#setOptions(type, options)

### resilient.VERSION
Type: `string`

Current library version

### resilient.defaults
Type: `object`

Default config options

### resilient.Servers(list)

Create a new servers store

### resilient.Options(options)

Create a new options store

### resilient.request(options [, cb])

Create a new options store

## Contributing

Wanna help? Cool! It will be appreciated :)

You must add new test cases for any new feature or refactor you do,
always following the same design/code patterns that already exist

### Development

Only [node.js](http://nodejs.org) is required for development

Clone the repository
```bash
$ git clone https://github.com/resilient-http/resilient.js.git && cd resilient.js
```

Install development dependencies
```bash
$ npm install
```

Install browser dependencies
```bash
$ bower install
```

Generate browser bundle source
```bash
$ make browser
```

Run tests (in a headless browser)
```bash
$ make test
```

Run tests (in real browsers)
```bash
$ make karma
```

## License

[MIT](http://opensource.org/licenses/MIT) © Tomas Aparicio and contributors

[travis]: http://travis-ci.org/resilient-http/resilient.js
