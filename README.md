# Restaurant Inventory Management System

A comprehensive solution for restaurants to manage inventory, reduce food waste, and predict demand.

## Architecture

- **Frontend**: React Native mobile app
- **Backend**: Node.js Lambda functions
- **Database**: PostgreSQL (RDS) + Redis (ElastiCache)
- **Infrastructure**: AWS CDK (TypeScript)
- **API**: RESTful with OpenAPI 3.0 specification

## Project Structure

```
restaurant-inventory-system/
├── packages/
│   ├── mobile/              # React Native app
│   ├── api/                 # Lambda functions
│   ├── infrastructure/      # AWS CDK
│   └── shared/              # Shared types and utilities
├── docs/                    # API documentation
├── scripts/                 # Build and deployment scripts
└── .github/workflows/       # CI/CD pipelines
```

## Quick Start

1. Install dependencies: `npm install`
2. Deploy infrastructure: `npm run deploy:dev`
3. Start mobile app: `npm run mobile:start`

**Note**: This project uses `package-lock.json` to ensure reproducible builds in CI/CD. The lock file is committed to version control and should not be deleted.

## Development

- `npm run build` - Build all packages
- `npm run test` - Run all tests
- `npm run lint` - Lint all packages
- `npm run deploy:dev` - Deploy to development environment