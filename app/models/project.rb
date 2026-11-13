# A portfolio project. The content lives in config/projects.yml; there's no
# database table yet, but the interface matches what an Active Record model
# would give the views, so it can move to the database later.
class Project
  Link = Data.define(:label, :url)

  ATTRIBUTES = %i[slug name repo language tagline year stat stat_label summary highlights stack].freeze
  attr_reader(*ATTRIBUTES, :links)

  # Cached in production; re-read on every call in development and test, so
  # edits to config/projects.yml show up without restarting the server.
  def self.all
    return load_all if Rails.env.local?
    @all ||= load_all
  end

  def self.load_all
    YAML.load_file(Rails.root.join("config/projects.yml")).map { new(**_1.symbolize_keys) }.freeze
  end
  private_class_method :load_all

  def self.find(slug)
    all.find { _1.slug == slug } or raise ActiveRecord::RecordNotFound, "No project #{slug}"
  end

  def initialize(links: [], private: false, **attrs)
    ATTRIBUTES.each { instance_variable_set("@#{_1}", attrs.fetch(_1)) }
    @links = links.map { Link.new(**_1.symbolize_keys) }
    @private = private
  end

  def private? = @private

  # GitHub's colour for the repo's main language.
  LANGUAGE_COLORS = { "TypeScript" => "#3178c6", "Python" => "#3572A5", "PHP" => "#4F5D95", "Ruby" => "#701516" }.freeze
  def language_color = LANGUAGE_COLORS.fetch(language, "#8b949e")
  def to_param = slug
end
