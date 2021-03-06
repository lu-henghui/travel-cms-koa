'use strict';

const { LinValidator, Rule } = require('lin-mizar');
const { User } = require('../models/user');

class RegisterValidator extends LinValidator {
  constructor () {
    super();
    this.nickname = [
      new Rule('isNotEmpty', '昵称不可为空'),
      new Rule('isLength', '昵称长度必须在2~20之间', 2, 20)
    ];
    this.email = [
      new Rule('isOptional'),
      new Rule('isEmail', '电子邮箱不符合规范，请输入正确的邮箱')
    ];
    this.code = [
      new Rule('isNotEmpty', '验证码不可为空')
    ];
    this.password = [
      new Rule(
        'matches',
        '密码长度必须在6~22位之间，包含字符、数字和 _ ',
        /^[A-Za-z0-9_*&$#@]{6,22}$/
      )
    ];
    this.confirm_password = new Rule('isNotEmpty', '确认密码不可为空');
  }

  validateConfirmPassword (data) {
    if (!data.body.password || !data.body.confirm_password) {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
    let ok = data.body.password === data.body.confirm_password;
    if (ok) {
      return ok;
    } else {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
  }

  async validateEmail (vals) {
    const email = vals.body.email;
    const user = await User.findOne({
      where: {
        email,
        delete_time: null
      }
    });
    if (user) {
      return [false, '该邮箱已被注册'];
    } else {
      return true;
    }
  }
}

class LoginValidator extends LinValidator {
  constructor () {
    super();
    this.email = new Rule('isNotEmpty', '邮箱不可为空');
    this.password = new Rule('isNotEmpty', '密码不可为空');
  }
}

class ForgetValidator extends LinValidator {
  constructor () {
    super();
    this.email = [
      new Rule('isOptional'),
      new Rule('isEmail', '电子邮箱不符合规范，请输入正确的邮箱')
    ];
    this.code = [
      new Rule('isNotEmpty', '验证码不可为空')
    ];
    this.password = [
      new Rule(
        'matches',
        '密码长度必须在6~22位之间，包含字符、数字和 _ ',
        /^[A-Za-z0-9_*&$#@]{6,22}$/
      )
    ];
    this.confirm_password = new Rule('isNotEmpty', '确认密码不可为空');
  }

  validateConfirmPassword (data) {
    if (!data.body.password || !data.body.confirm_password) {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
    let ok = data.body.password === data.body.confirm_password;
    if (ok) {
      return ok;
    } else {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
  }

  async validateEmail (vals) {
    const email = vals.body.email;
    const user = await User.findOne({
      where: {
        email,
        delete_time: null
      }
    });
    if (user) {
      return true;
    } else {
      return [false, '该邮箱未被注册'];
    }
  }
}

class GetInformationValidator extends LinValidator {
  constructor () {
    super();
    this.nickname = new Rule('isNotEmpty', '昵称不可为空');
    this.city = new Rule('isNotEmpty', '城市不可为空');
    this.sex = new Rule('isNotEmpty', '性别不可为空');
    this.introduce = new Rule('isNotEmpty', '介绍不可为空');
  }
}

class VerifyValidator extends LinValidator {
  constructor () {
    super();
    this.email = new Rule('isNotEmpty', '邮箱不可为空');
    this.type = new Rule('isInt', 'type必须为正整数', { min: 1 });
  }

  async validateEmail (vals) {
    const type = vals.body.type;
    const email = vals.body.email;
    const user = await User.findOne({
      where: {
        email,
        delete_time: null
      }
    });
    if (type === 1) {
      if (user) {
        return [false, '该邮箱已被注册'];
      } else {
        return true;
      }
    } else {
      if (user) {
        return true;
      } else {
        return [false, '该邮箱已被注册'];
      }
    }
  }
}

class CreateOrUpdateUserValidator extends LinValidator {
  constructor () {
    super();
    this.nickname = new Rule('isNotEmpty', '必须传入昵称');
    this.email = new Rule('isNotEmpty', '必须传入邮箱');
    this.password = new Rule('isNotEmpty', '必须传入密码');
  }
}

class AvatarUpdateValidator extends LinValidator {
  constructor () {
    super();
    this.avatar = new Rule('isNotEmpty', '必须传入头像的url链接');
  }
}

class ChangePasswordValidator extends LinValidator {
  constructor () {
    super();
    this.new_password = new Rule(
      'matches',
      '密码长度必须在6~22位之间，包含字符、数字和 _ ',
      /^[A-Za-z0-9_*&$#@]{6,22}$/
    );
    this.confirm_password = new Rule('isNotEmpty', '确认密码不可为空');
    this.old_password = new Rule('isNotEmpty', '请输入旧密码');
  }

  validateConfirmPassword (data) {
    if (!data.body.new_password || !data.body.confirm_password) {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
    let ok = data.body.new_password === data.body.confirm_password;
    if (ok) {
      return ok;
    } else {
      return [false, '两次输入的密码不一致，请重新输入'];
    }
  }
}

module.exports = {
  RegisterValidator,
  LoginValidator,
  ForgetValidator,
  VerifyValidator,
  GetInformationValidator,
  CreateOrUpdateUserValidator,
  AvatarUpdateValidator,
  ChangePasswordValidator
};
