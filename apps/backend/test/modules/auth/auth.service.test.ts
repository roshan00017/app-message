import { AuthService } from '@/modules/auth/auth.service.js';

const mocks = vi.hoisted(() => ({
  findOneMock: vi.fn(),
  findByIdMock: vi.fn(),
  createMock: vi.fn(),
}));

const { findOneMock, createMock } = mocks;

const mockUserDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => 'user-1' },
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  avatar: null,
  comparePassword: vi.fn(),
  ...overrides,
});

// findOne returns a thenable query object that supports .select()
function findOneQuery(result: unknown) {
  const query = {
    select: vi.fn().mockReturnValue(Promise.resolve(result)),
  };
  return query;
}

vi.mock('@/models/user.model.js', () => ({
  UserModel: {
    findOne: mocks.findOneMock,
    findById: mocks.findByIdMock,
    create: mocks.createMock,
  },
}));

import { UserModel } from '@/models/user.model.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
    vi.mocked(UserModel.findOne).mockImplementation(findOneQuery);
  });

  describe('register', () => {
    it('creates a user and returns auth user data', async () => {
      vi.mocked(UserModel.findOne).mockResolvedValue(null as never);
      vi.mocked(UserModel.create).mockResolvedValue(mockUserDoc() as never);

      const user = await service.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password1',
      });

      expect(UserModel.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        password: 'Password1',
      });
      expect(user).toEqual({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        avatar: null,
      });
    });

    it('throws 409 when email is already registered', async () => {
      vi.mocked(UserModel.findOne).mockResolvedValue(mockUserDoc() as never);

      await expect(
        service.register({
          email: 'existing@example.com',
          name: 'Existing',
          password: 'Password1',
        })
      ).rejects.toMatchObject({ message: 'Email already registered', statusCode: 409 });

      expect(UserModel.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns user when credentials are valid', async () => {
      const userDoc = mockUserDoc({
        comparePassword: vi.fn().mockResolvedValue(true),
      });
      vi.mocked(UserModel.findOne).mockReturnValue(findOneQuery(userDoc) as never);

      const user = await service.login('test@example.com', 'Password1');

      expect(user.id).toBe('user-1');
      expect(user.role).toBe('user');
    });

    it('throws 401 when user is not found', async () => {
      vi.mocked(UserModel.findOne).mockReturnValue(findOneQuery(null) as never);

      await expect(service.login('nobody@example.com', 'Password1')).rejects.toMatchObject({
        message: 'Invalid credentials',
        statusCode: 401,
      });
    });

    it('throws 401 when password is incorrect', async () => {
      const userDoc = mockUserDoc({
        comparePassword: vi.fn().mockResolvedValue(false),
      });
      vi.mocked(UserModel.findOne).mockReturnValue(findOneQuery(userDoc) as never);

      await expect(service.login('test@example.com', 'WrongPass1')).rejects.toMatchObject({
        message: 'Invalid credentials',
        statusCode: 401,
      });
    });
  });

  describe('getUserById', () => {
    it('returns null when user does not exist', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(null as never);

      const user = await service.getUserById('missing');
      expect(user).toBeNull();
    });

    it('returns auth user for an existing user', async () => {
      vi.mocked(UserModel.findById).mockResolvedValue(mockUserDoc() as never);

      const user = await service.getUserById('user-1');
      expect(user?.id).toBe('user-1');
      expect(user?.email).toBe('test@example.com');
    });
  });
});