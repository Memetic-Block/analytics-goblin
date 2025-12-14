import { IsString, IsNotEmpty, Matches, Length } from 'class-validator'

export class UpdateSessionDto {
  @IsString()
  @IsNotEmpty()
  @Length(43, 43, { message: 'wallet_address must be exactly 43 characters' })
  @Matches(/^[a-zA-Z0-9_-]{43}$/, {
    message:
      'wallet_address must contain only base64url characters (A-Z, a-z, 0-9, -, _)'
  })
  wallet_address: string
}
