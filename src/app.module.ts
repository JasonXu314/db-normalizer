import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { serveClient } from './utils/utils';

@Module({
	imports: [...serveClient()],
	controllers: [AppController],
	providers: []
})
export class AppModule {}

