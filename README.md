# Transaction View Frame

This project provides a Farcaster frame for displaying EVM transactions. It is built on top of the [Loop Decoder](https://github.com/3loop/loop-decoder) - an open source library for transforming EVM transactions into a human readable format.

Example frame [link](https://decoder-frame.fly.dev/frame/8453/0x338447269f00f845de2c0a544282892d9566f7d17373225a623c69f10a3abea2):

<img width="481" alt="Screenshot 2024-09-23 at 17 35 40" src="https://github.com/user-attachments/assets/90690d8b-1190-474a-ae89-019741c06ef9">


## Endpoints

- **Frame Endpoint** `/frame/:chain/:hash` - This endpoint provides a Farcaster frame metadata with a transaction image from the transaction hash.

- **Interpreting Endpoint** `/interpret/:chain/:hash` - This endpoint provides a human-readable transaction image from the transaction hash.

## Database

This project uses SQLite as its database. At a minimum, you need to provide the WETH contract metadata. Other public contracts can be resolved using third-party strategies.

If you need a database snapshot for Ethereum Mainnet that includes common contracts metadata and contracts ABIs, please contact us on [Farcaster](https://warpcast.com/nastya) or [X](https://x.com/3loop_io).

## Requirements

To use this project you need to have [Bun](https://bun.sh/) installed on your machine.

## Development

For development, we will use [pnpm](https://pnpm.io/) as our package manager, because Drizzle Kit does not yet support bun sqlite.

Run the migration to create the database:

```bash
$ pnpm migrate
```

Start the development server:

```bash
$ pnpm dev
```

Optionally, start docker-compose to run local telemetry server:

```bash
$ cd ./local && docker-compose up
```

## Deploy with fly.io

Create a volume for sqlite

```bash
$ fly volumes create litefs --size 1
```

Create a new app:

```bash
$ fly launch
```

Configure the consul:

```bash
$ fly consul attach
```
