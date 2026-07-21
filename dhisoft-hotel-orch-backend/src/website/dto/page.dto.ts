import { IsArray, IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
export class CreatePageDto { @IsString() title!:string; @IsString() slug!:string; @IsObject() draftContent!:Record<string,unknown>; @IsObject() seo!:Record<string,unknown>; @IsArray() navigation!:unknown[]; @IsOptional() @IsString() themeId?:string; }
export class UpdatePageDto { @IsOptional() @IsString() title?:string; @IsOptional() @IsObject() draftContent?:Record<string,unknown>; @IsOptional() @IsObject() seo?:Record<string,unknown>; @IsOptional() @IsArray() navigation?:unknown[]; }
export class ReorderSectionsDto { @IsArray() sectionIds!:string[]; }
export class ThemeDto { @IsString() name!:string; @IsString() key!:string; @IsObject() config!:Record<string,unknown>; @IsOptional() @IsBoolean() active?:boolean; }
