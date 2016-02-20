var express = require('express');
var router = express.Router();

var crypto = require('crypto'),   // 用它来生成散列值加密密码
    User = require('../models/user.js'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js');

var multer  = require('multer');    // 使用multer 模块实现文件上传功能
var upload = multer({dest: './public/images'});


/* 首页 */
router.get('/', function (req, res) {
  //判断是否是第一页，并把请求的页数转换成 number 类型
  var page = parseInt(req.query.p) || 1;
  //查询并返回第 page 页的 10 篇文章
  Post.getTen(null, page, function (err, posts, total) {
    if (err) {
      posts = [];
      console.log(err);
    }
    res.render('index', {
      title: '主页',
      posts: posts,
      page: page,
      isFirstPage: (page - 1) == 0,
      isLastPage: ((page - 1) * 10 + posts.length) == total,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

// 注册页路由
router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
  res.render('reg', {
    title: '注册',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  })
});

// 注册页表单提交路由
router.post('/reg', checkNotLogin);
router.post('/reg', function (req, res) {
  var name = req.body.name,
      password = req.body.password,
      password_re = req.body['password-repeat'];
  //检验用户两次输入的密码是否一致
  if (password_re != password) {
    req.flash('error', '两次输入的密码不一致!');
    return res.redirect('/reg');//返回注册页
  }
  //生成密码的 md5 值
  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');
  var newUser = new User({
      name: name,
      password: password,
      email: req.body.email
  });
  //检查用户名是否已经存在
  User.get(newUser.name, function (err, user) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    if (user) {
      req.flash('error', '用户已存在!');
      return res.redirect('/reg');//返回注册页
    }
    //如果不存在则新增用户
    newUser.save(function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/reg');//注册失败返回主册页
      }
      req.session.user = newUser;//用户信息存入 session
      req.flash('success', '注册成功!');
      res.redirect('/');//注册成功后返回主页
    });
  });
});

// 登录页路由
router.post('/login', checkNotLogin);
router.get('/login', function (req, res) {
  res.render('login', {
    title: '登录',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

// 登录页表单提交路由
router.post('/login', function (req, res) {
  // 生成密码的md5值
  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');

  // 检查用户名是否存在
  User.get(req.body.name, function (err, user) {
    if (!user) {
      req.flash('error','用户不存在！');
      return res.redirect('/login');    // 跳转到登录页
    };

    if (user.password != password) {
      req.flash('error','密码错误!');
      return res.redirect('/login');    // 密码错误跳转到登录页
    };
    req.session.user = user;
    // req.flash('success','登录成功！');
    res.redirect('/');   // 登录成功后跳转到主页
  });
});

// 发表页路由
router.get('/post', checkLogin);
router.get('/post', function (req, res) {
  res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()})
});

// 发表页表单提交路由
router.post('/post', checkLogin);
router.post('/post', function (req, res) {
  var currentUser = req.session.user,
    tags = [req.body.tag1, req.body.tag2, req.body.tag3],
    post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);

  post.save(function (err) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/post');
    };
    res.redirect('/');    // 发表成功跳转到首页
    // req.flash('success', '发布成功！');
  });
});

// 登出路由
router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
  req.session.user = null;    // 把sess赋值null丢掉session中用户的信息
  // req.flash('success','登出成功!');
  res.redirect('/');    // 登出成功后跳转到主页
});

// 上传路由
router.get('/upload', checkLogin);
router.get('/upload', function (req, res) {
  res.render('upload', {
    title: '文件上传',
    user: req.session.user,
    success: req.flash('success').toString(),
    error: req.flash('error').toString()
  });
});

// 上传表单路由
router.post('/upload', checkLogin);
router.post('/upload', upload.fields([
    { name: 'file1' },
    { name: 'file2' },
    { name: 'file3' },
    { name: 'file4' },
    { name: 'file5' },
  ]), function (req, res, next) {
        for(var i in req.files){
            console.log(req.files[i]);
        }
        // req.flash('success', '文件上传成功!');
        res.redirect('/upload');
      }
);

// 用户页
router.get('/u/:name', function (req, res) {
  var page = parseInt(req.query.p) || 1;
  //检查用户是否存在
  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在!');
      return res.redirect('/');
    }
    //查询并返回该用户第 page 页的 10 篇文章
    Post.getTen(user.name, page, function (err, posts, total) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('user', {
        title: user.name,
        posts: posts,
        page: page,
        isFirstPage: (page - 1) == 0,
        isLastPage: ((page - 1) * 10 + posts.length) == total,
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
      });
    });
  });
});

// 文章页
router.get('/u/:name/:day/:title', function (req, res) {
  Post.getOne(req.params.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }

    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

// 编辑页路由
router.get('/edit/:name/:day/:title', checkLogin)
router.get('/edit/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user
  Post.getOne(currentUser.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    res.render('edit', {
      title: '编辑',
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

// 编辑页表单提交路由
router.post('/edit/:name/:day/:title', checkLogin);
router.post('/edit/:name/:day/:title', function (req, res) {
  // 保存session.user
  var currentUser = req.session.user
  Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
    var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
    if (err) {
      req.flash('error', err);
      res.redirect(url);
    };
    // req.flash('success', '修改成功');
    res.redirect(url);
  });
});

// 删除路由
router.post('/remove/:name/:day/:title', checkLogin);
router.get('/remove/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user
  Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
    if (err) {
      req.flash('error', err);
      res.redirect('back');
    };
    // req.flash('success', '删除成功');
    res.redirect('/');
  });
});

router.get('/u/:name', function (req, res) {
  //检查用户是否存在
  User.get(req.params.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在!');
      return res.redirect('/');//用户不存在则跳转到主页
    }
    //查询并返回该用户的所有文章
    Post.getAll(user.name, function (err, posts) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      res.render('user', {
        title: user.name,
        posts: posts,
        user : req.session.user,
        success : req.flash('success').toString(),
        error : req.flash('error').toString()
      });
    });
  });
});


// 编辑路由
router.get('/edit/:name/:day/:title', checkLogin);
router.get('/edit/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.getOne(currentUser.name, req.params.day, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err);
      return res.redirect('back');
    }
    res.render('edit', {
      title: '编辑',
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.post('/edit/:name/:day/:title', checkLogin);
router.post('/edit/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function (err) {
    var url = encodeURI('/u/' + req.params.name + '/' + req.params.day + '/' + req.params.title);
    if (err) {
      req.flash('error', err);
      return res.redirect(url);//出错！返回文章页
    }
    req.flash('success', '修改成功!');
    res.redirect(url);//成功！返回文章页
  });
});

router.get('/remove/:name/:day/:title', checkLogin);
router.get('/remove/:name/:day/:title', function (req, res) {
  var currentUser = req.session.user;
  Post.remove(currentUser.name, req.params.day, req.params.title, function (err) {
    if (err) {
      req.flash('error', err);
      return res.redirect('back');
    }
    req.flash('success', '删除成功!');
    res.redirect('/');
  });
});

// 留言的post响应
router.post('/u/:name/:day/:title', function (req, res) {
  var date = new Date(),
      time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());

  var md5 = crypto.createHash('md5'),
    email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
    head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";

  var comment = {
      name: req.body.name,
      head: head,
      email: req.body.email,
      website: req.body.website,
      time: time,
      content: req.body.content
  };
  var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);

  newComment.save(function (err) {
    if (err) {
      req.flash('error', err);
      console.log(err)
      return res.redirect('back');
    }
    req.flash('success', '留言成功!');
    console.log('留言成功');
    res.redirect('back');
  });
});

router.get('/archive', checkLogin);
router.get('/archive', function (req, res) {
  Post.getArchive(function (err, posts) {
    if (err) {
      req.flash('error', err);
      console.log(err);
      return res.redirect('');
    };
    res.render('archive', {
      title: '存档',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/tags', function (req, res) {
  Post.getTags(function (err, posts) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    }
    res.render('tags', {
      title: '标签',
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/tags/:tag', function (req, res) {
  Post.getTag(req.params.tag, function (err, posts) {
    if (err) {
      req.flash('error',err);
      return res.redirect('/');
    }
    res.render('tag', {
      title: 'TAG:' + req.params.tag,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

// 搜索路由
router.get('/search', function (req, res) {
  Post.search(req.query.keyword, function (err, posts) {
    if (err) {
      req.flash('error', err);
      return res.redirect('/');
    };
    res.render('archive', {
      title: 'SEARCH:' + req.query.keyword,
      posts: posts,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

// 友情链接路由
// router.get('/links', function (req, res) {
//   res.render('links', {
//     title: '友情链接',
//     user: req.session.user,
//     success: req.flash('success').toString(),
//     error: req.flash('error').toString()
//   })
// })

// checkNotLogin 和 checkLogin 用来检测是否登陆，并通过 next() 转移控制权，检测到未登录则跳转到登录页，检测到已登录则跳转到前一个页面。
function checkLogin (req, res,next) {
  if (!req.session.user) {
    req.flash('error','未登录！');
    res.redirect('/login');
  };
  next();
}

function checkNotLogin (req, res, next) {
  if (req.session.user) {
    req.flash('error','已登录！');
    res.redirect('back');
  };
  next();
}

module.exports = router;


