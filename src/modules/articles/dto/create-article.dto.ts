import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ArticleStatus } from '@common/types/enums';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  briefing?: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  readingTime: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seoDescription?: string;

  @ApiPropertyOptional({
    enum: [ArticleStatus.DRAFT, ArticleStatus.PUBLISHED],
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsIn([ArticleStatus.DRAFT, ArticleStatus.PUBLISHED])
  status?: ArticleStatus.DRAFT | ArticleStatus.PUBLISHED;
}
