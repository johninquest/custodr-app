import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { createSchema } from 'zod-openapi';

import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './shared/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Fail fast on ambiguous routes. `specificity` makes `GET /contracts/upcoming`
    // win over `GET /contracts/:id` regardless of declaration order, and
    // `shadow: 'warn'` surfaces any remaining ordering traps at boot.
    routeConflictPolicy: { duplicate: 'error', shadow: 'warn' },
    routeResolutionStrategy: 'specificity',
  });

  // Zod schemas attached via `@Body({ schema })` are validated here and reused
  // for OpenAPI generation below — one source of truth per endpoint.
  app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));

  app.useGlobalFilters(new ApiExceptionFilter());

  // `/health` stays outside the prefix: the docker-compose healthcheck and the
  // Go API both probe the root path.
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86_400,
  });

  const config = new DocumentBuilder()
    .setTitle('Custodr API')
    .setDescription('Contract and renewal management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, {
      standardSchemaConverter: (schema, { schemaType }) => {
        const converted = createSchema(schema as never, {
          io: schemaType,
          openapiVersion: '3.0.0',
        });
        return { schema: converted.schema, components: converted.components };
      },
    });

  SwaggerModule.setup('swagger', app, documentFactory);

  await app.listen(process.env.PORT ?? 8080);
}
await bootstrap();
