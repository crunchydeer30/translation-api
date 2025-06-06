import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventPublisher } from '@nestjs/cqrs';
import { RegisterCustomerHandler } from './register-customer.handler';
import { RegisterCustomerCommand } from './register-customer.command';
import { CustomerRepository } from 'src/internal/customer/infrastructure/repositories/customer.repository';
import { Customer } from 'src/internal/customer/domain/entities/customer.entity';
import { UserRole } from '../../interfaces/jwt-payload.interface';

describe('RegisterCustomerHandler', () => {
  let handler: RegisterCustomerHandler;
  let mockCustomerRepository: jest.Mocked<CustomerRepository>;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockEventPublisher: jest.Mocked<EventPublisher>;
  let mockCustomerInstance: jest.Mocked<Customer>;

  beforeEach(async () => {
    mockCustomerInstance = {
      id: 'test-customer-id',
      email: { value: 'test@example.com' },

      commit: jest.fn(),
    } as any;

    jest.spyOn(Customer, 'create').mockResolvedValue(mockCustomerInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterCustomerHandler,
        {
          provide: CustomerRepository,
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: {
            mergeObjectContext: jest
              .fn()
              .mockImplementation((customer: Customer) => customer),
          },
        },
      ],
    }).compile();

    handler = module.get<RegisterCustomerHandler>(RegisterCustomerHandler);
    mockCustomerRepository = module.get(CustomerRepository);
    mockJwtService = module.get(JwtService);
    mockEventPublisher = module.get(EventPublisher);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should register a customer successfully and return userId and accessToken', async () => {
      const command = new RegisterCustomerCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      const expectedAccessToken = 'mocked.access.token';
      mockJwtService.sign.mockReturnValue(expectedAccessToken);

      const result = await handler.execute(command);

      expect(Customer.create).toHaveBeenCalledWith({
        email: command.props.email,
        password: command.props.password,
        firstName: command.props.firstName,
        lastName: command.props.lastName,
      });

      expect(mockCustomerRepository.save).toHaveBeenCalledWith(
        mockCustomerInstance,
      );

      expect(mockCustomerRepository.save).toHaveBeenCalledTimes(1);

      expect(mockEventPublisher.mergeObjectContext).toHaveBeenCalledWith(
        mockCustomerInstance,
      );

      expect(mockCustomerInstance.commit).toHaveBeenCalledTimes(1);

      const expectedJwtPayload = {
        id: mockCustomerInstance.id,
        roles: [UserRole.CUSTOMER],
      };

      expect(mockJwtService.sign).toHaveBeenCalledWith(expectedJwtPayload);

      expect(mockJwtService.sign).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        userId: mockCustomerInstance.id,
        accessToken: expectedAccessToken,
      });
    });
  });
});
