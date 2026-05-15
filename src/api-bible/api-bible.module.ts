import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ApiBibleService } from './api-bible.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: 'https://rest.api.bible/v1',
        headers: {
          'api-key': config.get<string>('API_BIBLE_KEY'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ApiBibleService],
  exports: [ApiBibleService],
})
export class ApiBibleModule {}
