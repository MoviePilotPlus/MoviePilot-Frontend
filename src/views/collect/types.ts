export interface CategoryInfo {
  level?: string
  option_value?: string
  option_name?: string
  filter_key?: string
  index_name?: string
}

export interface CategoryItem {
  key: string
  value: string
}

export interface TencentFilterParams {
  type: string
  sort: string
  itype: string
  iyear: string
  pay: string
  iarea: string
  iregion: string
  itrailer: string
  producer: string
  award: string
  theater: string
  attr: string
  anime_status: string
  item: string
  iage: string
  gender: string
  language: string
  child_ip: string
  characteristic: string
  three: string
  ipay: string
  exclusive: string
  all: string
  prefer: string
  [key: string]: string
}

export interface MgtvFilterParams {
  type: string
  sort: string
  kind: string
  chargeInfo: string
  area: string
  feature: string
  year: string
  fitAge: string
  edition: string
  [key: string]: string
}

export interface YoukuFilterParams {
  type: string
  sort: string
  main_area: string
  tags: string
  source: string
  year: string
  pay_type: string
  brand: string
  tag_label_name: string
  theatre: string
  status: string
  completed: string
  show_label_type: string
  age: string
  child_tags: string
  company: string
  people: string
  division: string
  game_brand: string
  game_type: string
  [key: string]: string
}

export interface IQiyiFilterParams {
  type: string
  mode: string
  three_category_id_v2: string
  market_release_date_level: string
  smart_tag: string
  smart_tag_v2: string
  structure_id: string
  is_purchase: string
  is_album_finished: string
  is_limit_free: string
  is_exclusive: string
  is_qiyi_produced: string
  charge_control_paymark: string
  [key: string]: string
}

export interface TencentMediaInfo {
  source?: string
  type?: string
  cid?: string
  vid?: string | null
  title?: string
  sub_title?: string | null
  second_title?: string | null
  year?: string | null
  overview?: string | null
  new_pic_hz?: string | null
  new_pic_vt?: string | null
  episode_all?: string | null
}

export interface TencentEpisodeInfo {
  title?: string | null
  pay_type?: string | null
  play_title?: string | null
  web_play_url?: string | null
  image_url?: string | null
  cover_new_pic_hz?: string | null
  full_play_sub_title?: string | null
  duration?: string | null
  date?: string | null
  businessInfo?: string | null
  vid_encrypt?: string | null
  defn?: string | null
  vid?: string | null
  cid?: string | null
  episode?: number | null
}

export interface TencentDefinitionInfo {
  name?: string | null
  id?: string | null
  cname?: string | null
  fs?: number | null
}

export interface TencentVideoDetailInfo {
  source?: string | null
  type?: string | null
  cid?: string | null
  title?: string | null
  sub_title?: string | null
  year?: string | null
  new_pic_hz?: string | null
  new_pic_vt?: string | null
  publish_date?: string | null
  overview?: string | null
  episode_all?: string | null
  episode_list?: TencentEpisodeInfo[]
  definition_list?: TencentDefinitionInfo[]
}
