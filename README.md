## Réissë

> Réissë (knowledge of the day)

### About

This is just me fiddling around with neural networks and things, asana, google
calendar, and some quantified self stuff to try to generate the next thing to do
in the day.

So far it only lists things, with some hope i'll make it predict my future
schedule for today.

### Install dependencies

With Node.js installed, run the following one liner from the root folder:

```sh
npm install -g gulp bower && npm install && bower install
```

### Development workflow

#### Serve / watch

```sh
gulp serve
```

This outputs an IP address you can use to locally test and another that can be used on devices connected to your network.

#### Run tests

```sh
gulp test:local
```

This runs the unit tests defined in the `app/test` directory through [web-component-tester](https://github.com/Polymer/web-component-tester).

To run tests Java 7 or higher is required. To update Java go to http://www.oracle.com/technetwork/java/javase/downloads/index.html and download ***JDK*** and install it.

#### Build & Vulcanize

```sh
gulp
```

Build and optimize the current project, ready for deployment. This includes linting as well as vulcanization, image, script, stylesheet and HTML optimization and minification.

