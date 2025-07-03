# NestJS Detailed Guide with Examples

## Table of Contents
1. [Modules](#modules)
2. [Controllers](#controllers)
3. [Providers & Services](#providers--services)
4. [Dependency Injection](#dependency-injection)
5. [Middleware](#middleware)
6. [Pipes](#pipes)
7. [Guards](#guards)
8. [Interceptors](#interceptors)
9. [Exception Filters](#exception-filters)
10. [Custom Decorators](#custom-decorators)
11. [Configuration Management](#configuration-management)
12. [Database Integration](#database-integration)
13. [Authentication & Authorization](#authentication--authorization)
14. [Testing](#testing)
15. [Best Practices](#best-practices)

---

## Modules

### What are Modules?
Modules are the basic building blocks of NestJS applications. They organize related functionality into cohesive units.

### When to Use Modules?
- Group related controllers, services, and providers
- Create feature boundaries
- Manage application complexity
- Enable lazy loading and code splitting

### How to Create and Use Modules

#### Basic Module Structure
```typescript
// user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

@Module({
  imports: [], // Other modules to import
  controllers: [UserController], // Controllers in this module
  providers: [UserService, UserRepository], // Services and providers
  exports: [UserService], // What to expose to other modules
})
export class UserModule {}
```

#### Feature Module Example
```typescript
// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

#### Global Module
```typescript
// database.module.ts
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';

@Global() // Makes this module available everywhere
@Module({
  imports: [TypeOrmModule.forRoot()],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

---

## Controllers

### What are Controllers?
Controllers handle incoming HTTP requests and return responses to the client. They define the routing structure of your application.

### When to Use Controllers?
- Define API endpoints
- Handle HTTP requests (GET, POST, PUT, DELETE, etc.)
- Validate incoming data
- Return responses to clients

### Controller Examples

#### Basic Controller
```typescript
// user.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles('admin')
  async findAll(@Query() query: any) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
```

#### Advanced Controller with Custom Decorators
```typescript
// product.controller.ts
import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll() {
    return this.productService.findAll();
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.productService.create(createProductDto, file, user);
  }
}
```

---

## Providers & Services

### What are Providers?
Providers are classes that can be injected as dependencies. They include services, repositories, factories, helpers, etc.

### When to Use Services?
- Handle business logic
- Interact with external APIs
- Manage data access
- Share functionality across controllers

### Service Examples

#### Basic Service
```typescript
// user.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { BcryptService } from '../services/bcrypt/bcrypt.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly bcryptService: BcryptService,
  ) {}

  async findAll(query?: any): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (query.search) {
      queryBuilder.where('user.name ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', { role: query.role });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.bcryptService.hash(createUserDto.password);

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.password) {
      updateUserDto.password = await this.bcryptService.hash(updateUserDto.password);
    }

    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
```

#### Service with External API Integration
```typescript
// weather.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WeatherService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getWeather(city: string) {
    try {
      const apiKey = this.configService.get<string>('WEATHER_API_KEY');
      const response = await firstValueFrom(
        this.httpService.get(`https://api.weatherapi.com/v1/current.json`, {
          params: {
            key: apiKey,
            q: city,
          },
        })
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch weather data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
```

---

## Dependency Injection

### What is Dependency Injection?
DI is a design pattern where dependencies are provided to a class instead of the class creating them itself.

### When to Use DI?
- Manage service lifecycles
- Promote loose coupling
- Enable easier testing
- Share instances across the application

### DI Examples

#### Constructor Injection
```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { ProductService } from '../product/product.service';
import { EmailService } from '../services/email/email.service';
import { PaymentService } from '../services/payment/payment.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly emailService: EmailService,
    private readonly paymentService: PaymentService,
  ) {}

  async createOrder(userId: string, productIds: string[]) {
    // Use injected services
    const user = await this.userService.findOne(userId);
    const products = await this.productService.findByIds(productIds);

    // Process payment
    const payment = await this.paymentService.processPayment(user, products);

    // Send confirmation email
    await this.emailService.sendOrderConfirmation(user.email, products);

    return { user, products, payment };
  }
}
```

#### Property Injection
```typescript
// logger.service.ts
import { Injectable, Inject, Optional } from '@nestjs/common';

@Injectable()
export class LoggerService {
  @Inject('LOGGER_OPTIONS')
  private readonly options: any;

  @Optional()
  @Inject('EXTERNAL_LOGGER')
  private readonly externalLogger?: any;

  log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);

    if (this.externalLogger) {
      this.externalLogger.log(message);
    }
  }
}
```

#### Factory Providers
```typescript
// database.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
```

---

## Middleware

### What is Middleware?
Middleware functions are executed before route handlers and can modify the request/response objects.

### When to Use Middleware?
- Logging requests
- CORS handling
- Request parsing
- Authentication checks
- Rate limiting

### Middleware Examples

#### Custom Middleware
```typescript
// logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
  }
}
```

#### Application-Level Middleware
```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { LoggerMiddleware } from './middleware/logger.middleware';

@Module({
  // ... module configuration
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
```

#### Route-Specific Middleware
```typescript
// app.module.ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes(
        { path: 'users', method: RequestMethod.GET },
        { path: 'products', method: RequestMethod.ALL },
      );
  }
}
```

---

## Pipes

### What are Pipes?
Pipes transform and validate incoming request data before it reaches the route handler.

### When to Use Pipes?
- Validate request data
- Transform data types
- Provide default values
- Sanitize input

### Pipe Examples

#### Built-in Pipes
```typescript
// user.controller.ts
import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.userService.findAll({ page, limit });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
```

#### Custom Validation Pipe
```typescript
// custom-validation.pipe.ts
import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors.map(error =>
        Object.values(error.constraints).join(', ')
      );
      throw new BadRequestException(messages);
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
```

#### Custom Transformation Pipe
```typescript
// trim.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';

@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: any) {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'object' && value !== null) {
      Object.keys(value).forEach(key => {
        if (typeof value[key] === 'string') {
          value[key] = value[key].trim();
        }
      });
    }

    return value;
  }
}
```

---

## Guards

### What are Guards?
Guards determine whether a request should be handled by the route handler based on certain conditions.

### When to Use Guards?
- Authentication
- Authorization
- Role-based access control
- Request validation

### Guard Examples

#### Authentication Guard
```typescript
// jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

#### Role-Based Guard
```typescript
// roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

#### Custom Guard with External Service
```typescript
// rate-limit.guard.ts
import { Injectable, CanActivate, ExecutionContext, TooManyRequestsException } from '@nestjs/common';
import { RedisService } from '../services/redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const key = `rate_limit:${ip}`;

    const current = await this.redisService.incr(key);

    if (current === 1) {
      await this.redisService.expire(key, 60); // 1 minute window
    }

    if (current > 100) { // 100 requests per minute
      throw new TooManyRequestsException('Rate limit exceeded');
    }

    return true;
  }
}
```

---

## Interceptors

### What are Interceptors?
Interceptors add extra logic before and after method execution, allowing you to transform the result or handle exceptions.

### When to Use Interceptors?
- Response transformation
- Logging
- Error handling
- Caching
- Performance monitoring

### Interceptor Examples

#### Response Transformation Interceptor
```typescript
// response.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: T;
  statusCode: number;
  message: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map(data => ({
        data,
        statusCode: response.statusCode,
        message: 'Success',
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

#### Logging Interceptor
```typescript
// logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    this.logger.log(`${method} ${url} - Request started`);

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.log(`${method} ${url} - Request completed in ${duration}ms`);
      }),
    );
  }
}
```

#### Cache Interceptor
```typescript
// cache.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../services/redis/redis.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisService: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = `cache:${request.url}`;

    // Try to get from cache
    const cached = await this.redisService.get(key);
    if (cached) {
      return of(JSON.parse(cached));
    }

    // If not in cache, execute and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        await this.redisService.setex(key, 300, JSON.stringify(data)); // Cache for 5 minutes
      }),
    );
  }
}
```

---

## Exception Filters

### What are Exception Filters?
Exception filters handle and transform exceptions thrown during request processing.

### When to Use Exception Filters?
- Custom error responses
- Error logging
- Error transformation
- Global error handling

### Exception Filter Examples

#### Global Exception Filter
```typescript
// global-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

#### Custom Exception Filter
```typescript
// validation-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse() as any;

    response.status(status).json({
      statusCode: status,
      message: 'Validation failed',
      errors: exceptionResponse.message || exceptionResponse,
      timestamp: new Date().toISOString(),
    });
  }
}
```

---

## Custom Decorators

### What are Custom Decorators?
Custom decorators allow you to create reusable metadata and extract information from requests.

### When to Use Custom Decorators?
- Extract user information
- Add metadata to methods
- Create reusable request extractors
- Implement role-based decorators

### Custom Decorator Examples

#### Current User Decorator
```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
```

#### Roles Decorator
```typescript
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

#### API Response Decorator
```typescript
// api-response.decorator.ts
import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiResponseWrapper = <TModel extends Type<any>>(
  model: TModel,
  status = 200,
  description?: string,
) => {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          {
            properties: {
              data: {
                $ref: getSchemaPath(model),
              },
              statusCode: { type: 'number' },
              message: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        ],
      },
    }),
  );
};
```

---

## Configuration Management

### What is Configuration Management?
Configuration management handles environment variables and application settings in a type-safe way.

### When to Use Configuration Management?
- Environment-specific settings
- Database connections
- API keys and secrets
- Feature flags

### Configuration Examples

#### Configuration Service
```typescript
// app-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  get databaseUrl(): string {
    return this.configService.get<string>('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET');
  }

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get redisConfig() {
    return {
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    };
  }
}
```

#### Configuration Module
```typescript
// app-config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
      }),
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
```

---

## Database Integration

### What is Database Integration?
Database integration connects your NestJS application to databases using ORMs like TypeORM or Mongoose.

### When to Use Database Integration?
- Data persistence
- Complex queries
- Data relationships
- Database migrations

### Database Integration Examples

#### TypeORM Entity
```typescript
// user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Order } from '../order/entities/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: 'enum', enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];
}
```

#### Repository Pattern
```typescript
// user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findWithOrders(id: string): Promise<User | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['orders'],
    });
  }

  async create(userData: CreateUserDto): Promise<User> {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }

  async update(id: string, userData: UpdateUserDto): Promise<User> {
    await this.repository.update(id, userData);
    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findWithPagination(page: number, limit: number, search?: string): Promise<[User[], number]> {
    const queryBuilder = this.repository.createQueryBuilder('user');

    if (search) {
      queryBuilder.where(
        'user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search',
        { search: `%${search}%` }
      );
    }

    return queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
  }
}
```

---

## Authentication & Authorization

### What is Authentication & Authorization?
Authentication verifies user identity, while authorization determines what actions users can perform.

### When to Use Authentication & Authorization?
- User login/logout
- Protected routes
- Role-based access
- API security

### Authentication Examples

#### JWT Strategy
```typescript
// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
```

#### Auth Service
```typescript
// auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { BcryptService } from '../services/bcrypt/bcrypt.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly bcryptService: BcryptService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userService.findByEmail(email);

    if (user && await this.bcryptService.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      roles: user.roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };
  }
}
```

---

## Testing

### What is Testing in NestJS?
Testing ensures your application works correctly through unit tests, integration tests, and e2e tests.

### When to Use Testing?
- Verify functionality
- Prevent regressions
- Document behavior
- Ensure code quality

### Testing Examples

#### Unit Test
```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { BcryptService } from '../services/bcrypt/bcrypt.service';
import { CreateUserDto } from './dto/create-user.dto';

describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;
  let bcryptService: BcryptService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockBcryptService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: BcryptService,
          useValue: mockBcryptService,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    bcryptService = module.get<BcryptService>(BcryptService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashedPassword';
      const user = { id: '1', ...createUserDto, password: hashedPassword };

      jest.spyOn(bcryptService, 'hash').mockResolvedValue(hashedPassword);
      jest.spyOn(repository, 'create').mockReturnValue(user);
      jest.spyOn(repository, 'save').mockResolvedValue(user);

      const result = await service.create(createUserDto);

      expect(bcryptService.hash).toHaveBeenCalledWith(createUserDto.password);
      expect(repository.create).toHaveBeenCalledWith({
        ...createUserDto,
        password: hashedPassword,
      });
      expect(repository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });
});
```

#### E2E Test
```typescript
// user.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('UserController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/users (GET)', () => {
    return request(app.getHttpServer())
      .get('/users')
      .expect(200);
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      })
      .expect(201);
  });
});
```

---

## Best Practices

### 1. Project Structure
```
src/
├── common/                 # Shared utilities
│   ├── decorators/        # Custom decorators
│   ├── filters/           # Exception filters
│   ├── guards/            # Guards
│   ├── interceptors/      # Interceptors
│   └── pipes/             # Pipes
├── config/                # Configuration
├── modules/               # Feature modules
│   ├── auth/
│   ├── user/
│   └── product/
├── services/              # Shared services
└── main.ts
```

### 2. Error Handling
- Use custom exception filters
- Implement proper logging
- Return consistent error responses
- Handle async errors properly

### 3. Validation
- Use DTOs for all inputs
- Implement comprehensive validation
- Use custom validation pipes
- Validate at multiple levels

### 4. Security
- Implement proper authentication
- Use role-based authorization
- Validate all inputs
- Use HTTPS in production
- Implement rate limiting

### 5. Performance
- Use caching where appropriate
- Implement database indexing
- Use pagination for large datasets
- Optimize database queries

### 6. Testing
- Write unit tests for services
- Write integration tests for controllers
- Write e2e tests for critical flows
- Maintain high test coverage

### 7. Documentation
- Use Swagger/OpenAPI
- Document complex business logic
- Maintain README files
- Use meaningful commit messages

### 8. Code Quality
- Follow TypeScript best practices
- Use ESLint and Prettier
- Implement proper error handling
- Write clean, readable code

---

## Advanced Concepts

### 1. Microservices
```typescript
// microservice setup
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: {
      host: 'localhost',
      port: 3001,
    },
  });
  await app.listen();
}
bootstrap();
```

### 2. WebSockets
```typescript
// websocket gateway
import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(@MessageBody() message: string): void {
    this.server.emit('message', message);
  }
}
```

### 3. GraphQL
```typescript
// graphql resolver
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => [User])
  async users(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Mutation(() => User)
  async createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.userService.create(input);
  }
}
```

---

This comprehensive guide covers all major NestJS concepts with practical examples, usage patterns, and best practices. Each section includes real-world examples that you can adapt to your specific use cases.