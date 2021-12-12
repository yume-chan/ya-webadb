
## Development

The repository uses [Rush](https://rushjs.io/) for monorepo management.

### Install Rush globally

```sh
$ npm i -g @microsoft/rush
```

### Install dependencies

```sh
$ rush update
```

### Everyday commands

1. Build all packages:

    ```sh
    $ rush build
    ```

2. Watch and rebuild all libraries:

    ```sh
    $ rush build:watch
    ```

3. Start demo dev-server:

    ```sh
    $ cd apps/demo
    $ npm run dev
    ```

Usually you need two terminals to run both 2 and 3.
