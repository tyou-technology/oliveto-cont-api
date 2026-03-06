import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/guards/roles.guard';
import { PaginationQueryRequest } from '@common/dto/pagination.dto';
import { Role } from '@common/types/enums';
import { JwtPayload } from '@common/types/jwt-payload.type';
import {
  USER_ACTIONS,
  USER_ERROR_MESSAGES,
  USERS_ROUTES,
} from '@modules/users/constants/users.constants';
import { enrichEvent } from '@common/utils/enrich-event.util';
import { UpdateUserRequest, UpdateUserRoleRequest } from '@modules/users/dto/update-user.request';
import { UserEntity } from '@modules/users/entity/user.entity';
import { UsersService } from '@modules/users/service/users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller(USERS_ROUTES.BASE)
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  @Get(USERS_ROUTES.ME)
  async getMe(@CurrentUser() currentUser: JwtPayload, @Req() req?: Request) {
    const user = await this.usersService.findById(currentUser.id);

    enrichEvent(req, {
      user: {
        action: USER_ACTIONS.PROFILE_VIEW,
        id: user.id,
        role: user.role,
      },
    });

    return {
      data: user,
      _links: {
        self: { href: '/users/me', method: 'GET' },
        update: { href: '/users/me', method: 'PATCH' },
      },
    };
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ type: UserEntity })
  @Patch(USERS_ROUTES.ME)
  async updateMe(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateUserRequest,
    @Req() req?: Request,
  ) {
    const user = await this.usersService.update(currentUser.id, dto);

    const fields_changed = Object.keys(dto).filter(
      (k) => dto[k as keyof UpdateUserRequest] !== undefined,
    );

    enrichEvent(req, {
      user: {
        action: USER_ACTIONS.PROFILE_UPDATE,
        id: user.id,
        role: user.role,
        fields_changed,
      },
    });

    return {
      data: user,
      _links: {
        self: { href: '/users/me', method: 'GET' },
        update: { href: '/users/me', method: 'PATCH' },
      },
    };
  }

  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiOkResponse({ type: [UserEntity] })
  @Roles(Role.ADMIN)
  @Get()
  async listUsers(@Query() query: PaginationQueryRequest, @Req() req?: Request) {
    const result = await this.usersService.list(query);

    enrichEvent(req, {
      user: {
        action: USER_ACTIONS.LIST,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
      },
    });

    return {
      ...result,
      _links: {
        self: { href: '/users', method: 'GET' },
      },
    };
  }

  @ApiOperation({ summary: 'Change a user role (admin only)' })
  @ApiOkResponse({ type: UserEntity })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse({ description: 'Cannot change own role' })
  @Roles(Role.ADMIN)
  @Patch(USERS_ROUTES.ROLE)
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleRequest,
    @CurrentUser() currentUser?: JwtPayload,
    @Req() req?: Request,
  ) {
    if (currentUser?.id === id) {
      throw new ForbiddenException(USER_ERROR_MESSAGES.ADMIN_CANNOT_CHANGE_OWN_ROLE);
    }

    const user = await this.usersService.updateRole(id, dto);

    enrichEvent(req, {
      user: {
        action: USER_ACTIONS.ROLE_CHANGE,
        id: user.id,
        role_to: user.role,
        requested_by: currentUser?.id,
      },
    });

    return {
      data: user,
      _links: {
        self: { href: `/users/${id}`, method: 'GET' },
        collection: { href: '/users', method: 'GET' },
      },
    };
  }
}
