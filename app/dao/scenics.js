'use strict';

const { NotFound, Forbidden } = require('lin-mizar');
const { Scenics } = require('../models/scenics');
const { Around } = require('../models/around');
const Sequelize = require('sequelize');

class ScenicsDao {
  /**
   * 根据ID获取旅行地
   * @param {int} id 旅行地ID
   */
  async getScenics (id) {
    const scenics = await Scenics.findOne({
      where: {
        id,
        delete_time: null
      }
    });
    let arounds = await Around.findAll({
      attributes: [
        Sequelize.col('s.id'),
        Sequelize.col('s.name'),
        Sequelize.col('s.image')
      ],
      where: {
        sid: scenics.id,
        delete_time: null
      },
      include: [{
        association: AroundBelongsToScenics,
        attributes: []
      }],
      raw: true
    });
    return {
      scenics,
      arounds
    };
  }

  async getScenicsByKeyword (q) {
    const scenics = await Scenics.findOne({
      where: {
        title: {
          [Sequelize.Op.like]: `%${q}%`
        },
        delete_time: null
      }
    });
    return scenics;
  }

  /**
   * 获取所有景点
   */
  async getAllScenics () {
    const scenics = await Scenics.findAll({
      where: {
        delete_time: null
      }
    });
    return scenics;
  }

  async createScenics (v) {
    const scenics = await Scenics.findOne({
      where: {
        name: v.get('body.name'),
        delete_time: null
      }
    });
    if (scenics) {
      throw new Forbidden({
        msg: '旅游地已存在'
      });
    }
    const bk = new Scenics();
    bk.name = v.get('body.name');
    bk.position = v.get('body.position');
    bk.image = v.get('body.image');
    bk.save();
  }

  async updateScenics (v, id) {
    const scenics = await Scenics.findByPk(id);
    if (!scenics) {
      throw new NotFound({
        msg: '没有找到相关旅游地'
      });
    }
    scenics.name = v.get('body.name');
    scenics.position = v.get('body.position');
    scenics.image = v.get('body.image');
    scenics.save();
  }

  async deleteScenics (id) {
    const scenics = await Scenics.findOne({
      where: {
        id,
        delete_time: null
      }
    });
    if (!scenics) {
      throw new NotFound({
        msg: '没有找到相关旅游地'
      });
    }
    scenics.destroy();
  }
}

const AroundBelongsToScenics = Around.belongsTo(Scenics, {
  // 最外部的作用域就定义一下这个映射关系，这样运行周期里只会执行一次
  foreignKey: 'aid', targetKey: 'id', as: 's'
});

module.exports = { ScenicsDao };