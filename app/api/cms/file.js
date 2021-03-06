'use strict';

const { LinRouter, ParametersException, loginRequired } = require('lin-mizar');
const { LocalUploader } = require('../../extensions/file/local-uploader');
const { PositiveIdValidator } = require('../../validators/common');
const { db } = require('lin-mizar/lin/db');

const file = new LinRouter({
  prefix: '/cms/file'
});

file.linPost('upload', '/', {}, loginRequired, async ctx => {
  const files = await ctx.multipart();
  if (files.length < 1) {
    throw new ParametersException({ msg: '未找到符合条件的文件资源' });
  }
  const uploader = new LocalUploader('app/assets');
  const arr = await uploader.upload(files);
  ctx.json(arr);
});

file.linGet('get', '/:id', {}, loginRequired, async ctx => {
  const v = await new PositiveIdValidator().validate(ctx);
  const id = v.get('path.id');
  const images = await db.query(
    'SELECT lin_file.* FROM lin_file WHERE lin_file.id=:id',
    {
      replacements: {
        id
      },
      type: db.QueryTypes.SELECT
    }
  );
  ctx.json(images);
});

module.exports = { file };
