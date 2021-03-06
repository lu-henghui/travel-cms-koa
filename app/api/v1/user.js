'use strict';

const Redis = require('koa-redis'); // redis-server.exe redis.windows.conf 运行redis
const email = require('../../libs/sendEmail'); // 引入封装好的函数
const {
  LinRouter,
  Failed,
  NotFound,
  LimitException,
  loginRequired,
  groupRequired,
  disableLoading
} = require('lin-mizar');
// const { getSafeParamId } = require('../../libs/util');
const {
  loginRequire,
  getTokens,
  refreshTokenRequiredWithUnifyException
} = require('../../libs/jwt');
const {
  RegisterValidator,
  LoginValidator,
  ForgetValidator,
  VerifyValidator,
  GetInformationValidator,
  // CreateOrUpdateUserValidator,
  AvatarUpdateValidator,
  ChangePasswordValidator
} = require('../../validators/user');

const { PositiveIdValidator, SearchValidator, PaginateValidator } = require('../../validators/common');

const { User } = require('../../models/user');
const { UserDao } = require('../../dao/user');

// user 的红图实例
const userApi = new LinRouter({
  prefix: '/v1/user'
});

// user 的dao 数据库访问层实例
const userDto = new UserDao();

const Store = new Redis().client;

/**
 * 注册
 */
userApi.post('/register', async ctx => {
  const v = await new RegisterValidator().validate(ctx);
  const user = {
    email: v.get('body.email'),
    code: v.get('body.code')
  };
  const saveCode = await Store.hget(`nodemail:${user.email}`, 'code');
  const saveExpire = await Store.hget(`nodemail:${user.email}`, 'expire');
  if (user.code === saveCode) { // 验证码相同
    if (new Date().getTime() - saveExpire > 0) { // 验证码过期
      throw new Failed({
        msg: '验证码已过期，请重新尝试'
      });
    }
  } else { // 验证码错误
    throw new Failed({
      msg: '请填写正确的验证码'
    });
  }
  await userDto.createUser(v);
  ctx.success({
    msg: '注册成功'
  });
});

/**
 * 忘记密码
 */
userApi.post('/forget', async ctx => {
  const v = await new ForgetValidator().validate(ctx);
  const email = v.get('body.email');
  const code = v.get('body.code');
  const saveCode = await Store.hget(`nodemail:${email}`, 'code');
  const saveExpire = await Store.hget(`nodemail:${email}`, 'expire');
  if (code === saveCode) { // 验证码相同
    if (new Date().getTime() - saveExpire > 0) { // 验证码过期
      throw new Failed({
        msg: '验证码已过期，请重新尝试'
      });
    }
  } else { // 验证码错误
    throw new Failed({
      msg: '请填写正确的验证码'
    });
  }
  await userDto.forgetPassword(v);
  ctx.success({
    msg: '修改密码成功'
  });
});

/**
 * 登录
 */
userApi.post('/login', async ctx => {
  const v = await new LoginValidator().validate(ctx);
  let user = await User.verify(
    v.get('body.email'),
    v.get('body.password')
  );
  const { accessToken, refreshToken } = getTokens(user);
  ctx.json({
    access_token: accessToken,
    refresh_token: refreshToken
  });
});

/**
 * 邮箱验证
 */
userApi.post('/verify', async ctx => {
  const v = await new VerifyValidator().validate(ctx);
  const mail = v.get('body.email');
  const type = v.get('body.type');
  const saveExpire = await Store.hget(`nodemail:${mail}`, 'expire');
  const code = Math.floor(Math.random() * 8999) + 1000; // 生成四位随机验证码
  const expire = new Date().getTime() + 3 * 60 * 1000; // 生成过期时间

  if (saveExpire && new Date().getTime() - saveExpire < 0) {
    throw new LimitException({
      msg: '验证请求过于频繁，3分钟内1次'
    });
  }
  async function timeout () {
    return new Promise((resolve, reject) => {
      email.sendMail(mail, code, state => {
        resolve(state);
      }, type);
    });
  }
  await timeout().then(state => {
    if (state) {
      Store.hmset(
        `nodemail:${mail}`,
        'code',
        code,
        'expire',
        expire,
        'email',
        mail
      );
      ctx.success({
        msg: '邮件发送成功'
      });
    } else {
      throw new Failed({
        msg: '邮件发送失败'
      });
    }
  });
});

/**
 * 刷新令牌
 */
userApi.get('/refresh', refreshTokenRequiredWithUnifyException, async ctx => {
  let user = ctx.currentUser;
  const { accessToken, refreshToken } = getTokens(user);
  ctx.json({
    access_token: accessToken,
    refresh_token: refreshToken
  });
});

/**
 * 查询自己信息
 */
userApi.get('/getInformation', loginRequire, async ctx => {
  const user = ctx.currentUser;
  ctx.json(user);
});

/**
 * 修改自己信息
 */
userApi.post('/changeInformation', loginRequire, async ctx => {
  const v = await new GetInformationValidator().validate(ctx);
  await userDto.updateUser(ctx, v);
  ctx.success({
    msg: '修改成功'
  });
});

/**
 * 修改密码
 */
userApi.put('/change_password', loginRequire, async ctx => {
  const v = await new ChangePasswordValidator().validate(ctx);
  let user = ctx.currentUser;
  const ok = user.changePassword(
    v.get('body.old_password'),
    v.get('body.new_password')
  );
  if (!ok) {
    throw new NotFound({
      msg: '修改密码失败，你可能输入了错误的旧密码'
    });
  }
  user.save();
  ctx.success({
    msg: '密码修改成功'
  });
});

userApi.put('/avatar', loginRequire, async ctx => {
  const v = await new AvatarUpdateValidator().validate(ctx);
  const avatar = v.get('body.avatar');
  let user = ctx.currentUser;
  user.avatar = avatar;
  await user.save();
  ctx.success({ msg: '更新头像成功' });
});

/**
 * 关注用户
 */
userApi.post('/follow', loginRequire, async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  await userDto.follow(ctx, v);
  ctx.success({
    msg: '关注成功'
  });
});

/**
 * 取消关注用户
 */
userApi.post('/unfollow', loginRequire, async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  await userDto.unfollow(ctx, v);
  ctx.success({
    msg: '取消关注成功'
  });
});

/**
 * 获取用户ID的粉丝
 */
userApi.get('/fans/:id', async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  const id = v.get('path.id');
  const fans = await userDto.getFansById(id);
  if (!fans || fans.length < 1) {
    throw new NotFound({
      msg: '该用户还没有粉丝！'
    });
  }
  ctx.json(fans);
});

/**
 * 获取用户ID的关注
 */
userApi.get('/follows/:id', async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  const id = v.get('path.id');
  const follows = await userDto.getFollowsById(id);
  if (!follows || follows.length < 1) {
    throw new NotFound({
      msg: '你还没有关注'
    });
  }
  ctx.json(follows);
});

/**
 * 搜索用户
 */
userApi.get('/search', async ctx => {
  const v = await new SearchValidator().validate(ctx);
  const users = await userDto.getUserByKeyword(v.get('query.q'));
  if (!users || users.length < 1) {
    throw new NotFound({
      msg: '没有找到相关用户'
    });
  }
  ctx.json(users);
});

/**
 * 根据ID获取用户
 */
userApi.get('/:id', loginRequire, async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  const id = v.get('path.id');
  const user = await userDto.getUserWithFollow(ctx, id);
  if (!user) {
    throw new NotFound({
      msg: '没有找到相关用户'
    });
  }
  ctx.json(user);
});

/**
 * CMS 查看用户ID的详细信息
 */
userApi.get('/cms/:id', async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  const id = v.get('path.id');
  const user = await userDto.getUser(id);
  if (!user) {
    throw new NotFound({
      msg: '没有找到相关用户'
    });
  }
  ctx.json(user);
});

/**
 * CMS 查看用户列表
 */
userApi.get('/', loginRequired, async ctx => {
  const v = await new PaginateValidator().validate(ctx);
  const { users, total } = await userDto.getUsers(
    ctx,
    v.get('query.page'),
    v.get('query.count')
  );
  ctx.json({
    items: users,
    total: total,
    page: v.get('query.page'),
    count: v.get('query.count'),
    total_page: Math.ceil(total / parseInt(v.get('query.count')))
  });
});

// userApi.post('/', async ctx => {
//   const v = await new CreateOrUpdateUserValidator().validate(ctx);
//   await userDto.createUser(v);
//   ctx.success({
//     msg: '新建用户成功'
//   });
// });

// userApi.put('/:id', async ctx => {
//   const v = await new CreateOrUpdateUserValidator().validate(ctx);
//   const id = getSafeParamId(ctx);
//   await userDto.updateUser(v, id);
//   ctx.success({
//     msg: '更新用户成功'
//   });
// });

userApi.linDelete(
  'deleteUser',
  '/:id',
  {
    auth: '删除用户',
    module: '用户',
    mount: true
  },
  groupRequired,
  async ctx => {
    const v = await new PositiveIdValidator().validate(ctx);
    const id = v.get('path.id');
    await userDto.deleteUser(id);
    ctx.success({
      msg: '删除用户成功'
    });
  }
);

module.exports = { userApi, [disableLoading]: false };
