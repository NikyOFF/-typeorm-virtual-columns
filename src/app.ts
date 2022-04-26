import './typeorm.polyfill';

import {DataSource, DataSourceOptions, Equal, MoreThanOrEqual} from 'typeorm';
import { UserEntity } from './entity/user.entity';
import { PostEntity } from './entity/post.entity';
import { LikeEntity } from './entity/like.entity';

const options: DataSourceOptions = {
  type: 'postgres',
  host: '0.0.0.0',
  port: 5432,
  username: 'admin',
  password: 'admin',
  database: 'test',
  synchronize: true,
  entities: [UserEntity, PostEntity, LikeEntity],
};

const APP_DATA_SOURCE = new DataSource(options);

async function bootstrap() {
  const userRepository = APP_DATA_SOURCE.getRepository(UserEntity);
  const postRepository = APP_DATA_SOURCE.getRepository(PostEntity);
  const likeRepository = APP_DATA_SOURCE.getRepository(LikeEntity);

  await userRepository.delete({});
  await postRepository.delete({});
  await likeRepository.delete({});

  const user0 = new UserEntity();
  user0.login = 'admin';
  user0.password = 'admin';
  user0.firstname = 'admin';
  user0.lastname = 'pavlov';

  const user1 = new UserEntity();
  user1.login = 'nikyoff';
  user1.password = 'why_you_read_my_password';
  user1.firstname = 'niky';
  user1.lastname = 'off';

  const post0 = new PostEntity();
  post0.text = 'hello how are you?';
  post0.title = 'hello';

  const post1 = new PostEntity();
  post1.text = 'another post';
  post1.title = 'wait here please';

  const post2 = new PostEntity();
  post2.text = 'some one';
  post2.title = 'one of as';

  await userRepository.save([user0, user1]);

  await postRepository.save([post0, post1, post2]);

  Promise.all([
    userRepository.createQueryBuilder().getMany(),
    postRepository.createQueryBuilder().getMany(),
  ])
    .then(async (value) => {
      const users = value[0];
      const posts = value[1];

      const like0 = new LikeEntity();
      like0.user = users[0];
      like0.post = posts[0];

      const like1 = new LikeEntity();
      like1.user = users[0];
      like1.post = posts[1];

      const like2 = new LikeEntity();
      like2.user = users[1];
      like2.post = posts[1];

      await likeRepository.save([like0, like1, like2]);

      return postRepository.count({
        where: {
          likes: Equal(0),
        },
      });
    })
    .then((countOfPosts) => {
      console.log('Count of posts where likes equal zero: ', countOfPosts);

      return postRepository.count({
        where: {
          likes: MoreThanOrEqual(1),
        },
      });
    })
    .then((countOfPosts) => {
      console.log('Count of posts where likes more then or equal one: ', countOfPosts);

      return postRepository.find();
    })
    .then((posts) => {
      console.log('Loaded posts: ', posts);

      return userRepository.find();
    })
  .then((users) => {
      console.log('Loaded users: ', users);
  });
}

APP_DATA_SOURCE.initialize()
  .then(bootstrap)
  .catch((error) => {
    console.log('Cannot connect: ', error);
  });
