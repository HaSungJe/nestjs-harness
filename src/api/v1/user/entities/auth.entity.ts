import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({name: 't_auth', comment: '권한 정보'})
export class AuthEntity {
    @PrimaryColumn({name: 'auth_id', comment: '권한 ID', length: 20, primaryKeyConstraintName: 'PK_Auth'})
    auth_id: string;

    @Column({name: 'auth_name', comment: '권한명', length: 50, nullable: false})
    auth_name: string;

    @Column({name: 'level', comment: '등급', nullable: false, default: 1})
    level: number;
}

/**
    insert into t_auth (auth_id, auth_name, level) values 
    ('SUPER_ADMIN', '총괄관리자', 999),
    ('ADMIN', '관리자', 998),
    ('USER', '사용자', 1)
 */