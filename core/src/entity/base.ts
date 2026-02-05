import {
  Index,
  UpdateDateColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';
import { CoolBaseEntity } from './typeorm';

/**
 * 模型基类
 */
export abstract class BaseEntity extends CoolBaseEntity {
  // 默认自增
  @PrimaryGeneratedColumn('increment', {
    comment: 'ID',
  })
  id: number;

  @Index()
  @CreateDateColumn({ comment: '创建时间' })
  createTime: Date;

  @Index()
  @UpdateDateColumn({ comment: '更新时间' })
  updateTime: Date;

  @Index()
  @Column({ comment: '租户ID', nullable: true })
  tenantId: number;
}
