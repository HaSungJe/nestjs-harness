import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({name: 't_position', comment: '직급 정보'})
export class PositionEntity {
    @PrimaryColumn({name: 'position_id', length: 32, comment: '직급 ID', primaryKeyConstraintName: 'PK_Position'})
    position_id: string;

    @Column({name: 'position_name', length: 50, nullable: false, comment: '직급명'})
    position_name: string;

    @Column({name: 'level', nullable: false, comment: '직급 순서 (숫자가 높을수록 상위)', default: 1})
    level: number;
}
