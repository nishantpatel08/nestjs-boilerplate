import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfig } from './config/database.config';
import { UserModule } from './module/user/user.module';
import { BcryptService } from './services/bcrypt/bcrypt.service';
import { AuthModule } from './module/auth/auth.module';
import { AppConfigModule } from './config/app/app-config.module';

@Module({
	imports: [
		AppConfigModule,
		TypeOrmModule.forRootAsync({
			imports: [AppConfigModule],
			useClass: DatabaseConfig,
		}),
		AuthModule,
		UserModule,
	],
	controllers: [AppController],
	providers: [AppService, BcryptService],
})
export class AppModule {}
