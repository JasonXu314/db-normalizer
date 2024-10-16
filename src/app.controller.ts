import { Controller, Get } from '@nestjs/common';
import { Page } from './utils/decorators/page.decorator';

@Controller()
export class AppController {
	@Page()
	@Get('/')
	public getHello(): PageProps {
		return {};
	}
}

