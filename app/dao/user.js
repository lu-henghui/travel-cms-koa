'use strict';

const { NotFound, Forbidden } = require('lin-mizar');
const { db } = require('lin-mizar/lin/db');
const { User } = require('../models/user');
const { Follow } = require('../models/follow')

class UserDao {
  /**
   * 根据ID获取用户信息
   * @param {object} ctx 用户信息
   * @param {int} id 用户ID
   */
  async getUserWithFollow (ctx, id) {
    const user = ctx.currentUser;
    let sql =
      'SELECT u.id, u.nickname, u.email, u.avatar, u.city, u.sex, u.introduce, u.notes, u.guides, u.fans, u.follows, f.id as followed FROM user u ';
    let userInfo = await db.query(
      sql +
        ' LEFT JOIN follow f ON u.id = f.be_eid AND f.eid = :eid WHERE u.id = :id AND u.delete_time IS NULL',
      {
        replacements: {
          eid: user.id,
          id: id
        },
        type: db.QueryTypes.SELECT
      }
    );
    return userInfo[0];
  }

  /**
   * 根据匹配文本查找用户
   * @param {String} q 匹配文本
   */
  async getUserByKeyword (q) {
    let sql =
    'SELECT u.id, u.nickname, u.email, u.avatar, u.city, u.sex, u.introduce, u.notes, u.guides, u.fans, u.follows FROM user u ';
    let users = await db.query(
      sql +
        ' WHERE u.delete_time IS NULL AND u.nickname LIKE :q ORDER BY u.create_time DESC ',
      {
        replacements: {
          q: '%' + q + '%'
        },
        type: db.QueryTypes.SELECT
      }
    );
    return users;
  }

  /**
   * 注册用户
   * @param {object} v 返回信息
   */
  async createUser (v) {
    const user = await User.findOne({
      where: {
        email: v.get('body.email'),
        delete_time: null
      }
    });
    if (user) {
      throw new Forbidden({
        msg: '用户已存在'
      });
    }
    const bk = new User();
    bk.nickname = v.get('body.nickname');
    bk.email = v.get('body.email');
    bk.avatar = v.get('body.avatar');
    bk.password = v.get('body.password');
    bk.save();
  }

  /**
   * 修改用户信息
   * @param {object} ctx 用户信息
   * @param {object} v 返回信息
   */
  async updateUser (ctx, v) {
    let user = ctx.currentUser;
    user.nickname = v.get('body.nickname');
    user.city = v.get('body.city');
    user.sex = v.get('body.sex');
    user.introduce = v.get('body.introduce');
    user.save();
  }

  /**
   * 修改密码
   * @param {object} v 返回信息
   */
  async forgetPassword (v) {
    const user = await User.findOne({
      where: {
        email: v.get('body.email'),
        delete_time: null
      }
    });
    if (!user) {
      throw new Forbidden({
        msg: '用户不存在'
      });
    }
    user.password = v.get('body.confirm_password');
    user.save();
  }

  /**
   * 关注用户
   * @param {object} ctx 用户信息
   * @param {object} v 返回信息
   */
  async follow (ctx, v) {
    let user = ctx.currentUser;
    let star = await User.findOne({
      where: {
        id: v.get('body.id'),
        delete_time: null
      }
    });
    const follow = await Follow.findOne({
      where: {
        eid: user.id,
        be_eid: v.get('body.id')
      }
    });
    if (follow) {
      throw new Forbidden({
        msg: '用户已关注'
      });
    }
    return db.transaction(async t => {
      await Follow.create({
        eid: user.id,
        be_eid: v.get('body.id')
      }, { transaction: t });
      await user.increment('follows', {
        by: 1, transaction: t
      });
      await star.increment('fans', {
        by: 1, transaction: t
      });
    });
  }

  /**
   * 取消关注用户
   * @param {object} ctx 用户信息
   * @param {object} v 返回信息
   */
  async unfollow (ctx, v) {
    let user = ctx.currentUser;
    let star = await User.findOne({
      where: {
        id: v.get('body.id'),
        delete_time: null
      }
    });
    const follow = await Follow.findOne({
      where: {
        eid: user.id,
        be_eid: v.get('body.id')
      }
    });
    if (!follow) {
      throw new Forbidden({
        msg: '用户已取消关注'
      });
    }
    return db.transaction(async t => {
      await follow.destroy({
        force: true,
        transaction: t
      });
      await user.decrement('follows', {
        by: 1,
        transaction: t
      });
      await star.decrement('fans', {
        by: 1,
        transaction: t
      });
    });
  }

  /**
   * 获取用户ID的粉丝
   * @param {object} id 用户信息
   */
  async getFansById (id) {
    let sql =
      'SELECT u.id, u.nickname, u.email, u.avatar, u.city, u.sex, u.introduce, u.notes, u.guides, u.fans, u.follows FROM user u, follow f ';
    let fans = await db.query(
      sql +
        ' WHERE u.id = f.eid AND f.be_eid = :id AND u.delete_time IS NULL ',
      {
        replacements: {
          id
        },
        type: db.QueryTypes.SELECT
      }
    );
    return fans;
  }

  /**
   * 获取用户ID的关注
   * @param {object} id 用户信息
   */
  async getFollowsById (id) {
    let sql =
      'SELECT u.id, u.nickname, u.email, u.avatar, u.city, u.sex, u.introduce, u.notes, u.guides, u.fans, u.follows, f.id as followed FROM user u, follow f ';
    let follows = await db.query(
      sql +
        ' WHERE u.id = f.be_eid AND f.eid = :id AND u.delete_time IS NULL ',
      {
        replacements: {
          id
        },
        type: db.QueryTypes.SELECT
      }
    );
    return follows;
  }

  /**
   * 获取所有用户
   * @param {Object} ctx 用户信息
   * @param {int} start 从第几条开始
   * @param {int} count1 每页多少条记录
   */
  async getUsers (ctx, start, count1) {
    let sql =
      ' SELECT u.id, u.nickname, u.email, u.sex, u.city FROM user u WHERE u.delete_time IS NULL ';
    let users = await db.query(
      sql +
      ' LIMIT :count OFFSET :start',
      {
        replacements: {
          count: count1,
          start: start * count1
        },
        type: db.QueryTypes.SELECT
      }
    );
    let sql1 =
      'SELECT COUNT(*) as count FROM user u WHERE u.delete_time IS NULL';
    let total = await db.query(sql1, {
      type: db.QueryTypes.SELECT
    });
    total = total[0]['count'];
    return {
      users,
      total
    };
  }

  /**
   * 根据用户ID获取用户信息
   * @param {int} id 用户ID
   */
  async getUser (id) {
    const user = await User.findOne({
      where: {
        id,
        delete_time: null
      }
    });
    return user;
  }

  async deleteUser (id) {
    const user = await User.findOne({
      where: {
        id,
        delete_time: null
      }
    });
    if (!user) {
      throw new NotFound({
        msg: '没有找到相关用户'
      });
    }
    user.destroy();
  }

  // async getAuths (ctx) {
  //   let user = ctx.currentUser;
  //   let auths = await ctx.manager.authModel.findAll({
  //     where: {
  //       group_id: user.group_id
  //     }
  //   });
  //   let group = await ctx.manager.groupModel.findOne({
  //     where: {
  //       id: user.group_id
  //     }
  //   });
  //   const aus = this.splitAuths(auths);
  //   set(user, 'auths', aus);
  //   console.log(user);
  //   if (group) {
  //     set(user, 'groupName', group.name);
  //   }
  //   return user;
  // }
}

module.exports = { UserDao };
