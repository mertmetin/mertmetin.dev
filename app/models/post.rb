# A blog post: a Markdown file in content/posts/ with YAML front matter.
#
#   ---
#   title: The upgrade that made my search worse
#   date: 2026-11-13
#   summary: One sentence for the index.
#   tags: [search, evaluation]
#   ---
#   Markdown body…
#
# Like Project, the interface matches Active Record closely enough to move to
# a database table later. Raw HTML in a post is dropped when rendering.
class Post
  DIR = Rails.root.join("content/posts")
  FRONT_MATTER = /\A---\s*\n(.*?)\n---\s*\n(.*)\z/m

  attr_reader :slug, :title, :date, :summary, :tags, :body

  def self.all
    return load_all if Rails.env.local?
    @all ||= load_all
  end

  def self.load_all
    Dir[DIR.join("*.md")].map { from_file(_1) }.sort_by { [ _1.date, _1.slug ] }.reverse.freeze
  end
  private_class_method :load_all

  def self.find(slug)
    all.find { _1.slug == slug } or raise ActiveRecord::RecordNotFound, "No post #{slug}"
  end

  def self.from_file(path)
    text = File.read(path, encoding: "UTF-8")
    match = FRONT_MATTER.match(text) or raise ArgumentError, "#{path}: missing front matter"
    meta = YAML.safe_load(match[1], permitted_classes: [ Date ]).symbolize_keys
    new(slug: File.basename(path, ".md").sub(/\A\d{4}-\d{2}-\d{2}-/, ""), body: match[2], **meta)
  end

  def initialize(slug:, title:, date:, summary:, body:, tags: [])
    @slug, @title, @date, @summary, @tags, @body = slug, title, date.to_date, summary, tags, body
  end

  def html
    Commonmarker.to_html(body, options: {
      parse: { smart: true },
      render: { unsafe: false },
      extension: { table: true, strikethrough: true, autolink: true, header_ids: "" }
    }).html_safe
  end

  def reading_minutes
    [ (body.split.size / 220.0).ceil, 1 ].max
  end

  def to_param = slug
end
