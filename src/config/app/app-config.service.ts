import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvVar } from 'src/decorator/env-var/env-var.decorator';

@Injectable()
export class AppConfigService {
	constructor(private readonly configService: ConfigService) {}

	// 🔹 Server Config
	@EnvVar('PORT')
	public port: string;

	@EnvVar('PREFIX')
	public prefix: string;

	// 🔹 MySQL Database Config
	@EnvVar('MYSQL_DB_HOST')
	public mysqlHost: string;

	@EnvVar('MYSQL_DB_PORT')
	public mysqlPort: string;

	@EnvVar('MYSQL_DB_USERNAME')
	public mysqlUser: string;

	@EnvVar('MYSQL_DB_PASSWORD')
	public mysqlPassword: string;

	@EnvVar('MYSQL_DB_DATABASE')
	public mysqlDatabase: string;

	// 🔹 JWT Secret Key
	@EnvVar('JWT_SECRET_KEY')
	public jwtSecret: string;

	// 🔹 SMTP Email Config
	@EnvVar('SMTP_HOST')
	public smtpHost: string;

	@EnvVar('SMTP_PORT')
	public smtpPort: string;

	@EnvVar('SMTP_USER')
	public smtpUser: string;

	@EnvVar('SMTP_PASS')
	public smtpPass: string;

	@EnvVar('SMTP_FROM_EMAIL')
	public smtpFromEmail: string;
}
