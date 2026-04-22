import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from "typeorm";
import { AuthEntity } from "./auth.entity";
import { PositionEntity } from "./position.entity";
import { StateEntity } from "./state.entity";

@Entity({name: 't_user', comment: '사용자 정보'})
@Unique('UK_User_LoginId', ['login_id'])
export class UserEntity {
    @PrimaryColumn({name: 'user_id', length: 32, comment: '사용자 ID', primaryKeyConstraintName: 'PK_User'})
    user_id: string;

    @ManyToOne(() => AuthEntity, {nullable: false, onUpdate: 'CASCADE', onDelete: 'CASCADE'})
    @JoinColumn({name: 'auth_id', referencedColumnName: 'auth_id', foreignKeyConstraintName: 'FK_User_Auth'})
    auth_id: string;

    @ManyToOne(() => StateEntity, {nullable: false, onUpdate: 'CASCADE', onDelete: 'CASCADE'})
    @JoinColumn({name: 'state_id', referencedColumnName: 'state_id', foreignKeyConstraintName: 'FK_User_State'})
    state_id: string;

    @ManyToOne(() => PositionEntity, {nullable: true, onUpdate: 'CASCADE', onDelete: 'CASCADE'})
    @JoinColumn({name: 'position_id', referencedColumnName: 'position_id', foreignKeyConstraintName: 'FK_User_Position'})
    position_id: string | null;

    @Column({name: 'login_id', length: 30, nullable: false, comment: '로그인 ID'})
    login_id: string;

    @Column({name: 'login_pw', length: 100, nullable: false, comment: '비밀번호'})
    login_pw: string;

    @Column({name: 'name', length: 50, nullable: false, comment: '이름'})
    name: string;

    @Column({name: 'nickname', length: 50, nullable: false, comment: '닉네임'})
    nickname: string;

    @Column({name: 'device_os', length: 20, nullable: true, comment: '디바이스 OS'})
    device_os: string;

    @Column({name: 'device_token', length: 255, nullable: true, comment: '디바이스 토큰'})
    device_token: string;

    @Column({name: 'create_at', type: 'timestamp', nullable: false, comment: '등록일'})
    create_at: Date;

    @Column({name: 'update_at', type: 'timestamp', nullable: false, comment: '수정일'})
    update_at: Date;

    @Column({name: 'resign_at', type: 'timestamp', nullable: true, comment: '퇴사일'})
    resign_at: Date | null;

    @BeforeInsert()
    insertTimestamp() {
        const now = new Date();
        this.create_at = now;
        this.update_at = now;
    }

    @BeforeUpdate()
    updateTimestamp() {
        this.update_at = new Date();
    }
}