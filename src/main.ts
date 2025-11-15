import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // Configure CORS
  const corsOrigin = configService.get('app.corsAllowedOrigin')
  app.enableCors({
    origin: corsOrigin,
    credentials: true
  })

  const port = configService.get('app.port')
  await app.listen(port)

  console.log(`Stats Goblin Mode ON @ port ${port}`)
}

bootstrap().catch((error) => {
  console.error('Error starting Stats Goblin:', error)
  process.exit(1)
})
