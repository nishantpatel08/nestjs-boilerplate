import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { BcryptService } from 'src/services/bcrypt/bcrypt.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { Loggable } from 'src/decorator/loggable/loggable.decorator';
import { MailSubjectConstant } from 'src/common/constant/mail-subject.constant';
import { TemplateConstant } from 'src/common/constant/template.constant';
import { MailService } from 'src/services/mail/mail.service';

@Loggable()
@Injectable()
export class UserService {
	constructor(
		private readonly bcryptService: BcryptService,
		private readonly userRepository: UserRepository,
		private readonly mailService: MailService,
	) {}

	public async create(createUserDto: CreateUserDto): Promise<User> {
		const password = createUserDto.password;
		createUserDto.password = await this.bcryptService.hashPassword(password);

		const user = await this.userRepository.create(createUserDto);

		await this.mailService.send({
			to: user.email,
			subject: MailSubjectConstant.REGISTRATION,
			template: TemplateConstant.REGISTRATION,
			context: {
				name: user.firstName,
			},
		});

		return user;
	}
}
